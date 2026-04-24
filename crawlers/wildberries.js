import { PlaywrightCrawler, sleep } from 'crawlee';

const CATEGORIES = [
  { url: 'https://www.wildberries.by/catalog/krasota/uhod-za-kozhey/uhod-za-litsom',   slug: 'uhod-za-litsom'   },
  { url: 'https://www.wildberries.by/catalog/krasota/uhod-za-kozhey/uhod-za-telom',    slug: 'uhod-za-telom'    },
  { url: 'https://www.wildberries.by/catalog/krasota/volosy/uhod-za-volosami',          slug: 'uhod-za-volosami' },
  { url: 'https://www.wildberries.by/catalog/krasota/volosy/shampuni-i-konditsionery', slug: 'shampuni'         },
  { url: 'https://www.wildberries.by/catalog/krasota/makiyazh',                         slug: 'makiyazh'         },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya',                     slug: 'parfyumeriya'     },
  { url: 'https://www.wildberries.by/catalog/krasota/aptechnaya-kosmetika',             slug: 'apteka'           },
  { url: 'https://www.wildberries.by/catalog/krasota/uhod-za-kozhey',                   slug: 'uhod-za-kozhey'   },
];

function extractPrice(item) {
  const price = item.sizes?.[0]?.price;
  if (!price) return 0;
  return ((price.product || price.basic) ?? 0) / 100;
}

export async function crawlWildberries(db) {
  const products = db.collection('products');

  // Module-level map avoids Crawlee deep-cloning the userData array
  const collectedByUrl = new Map(CATEGORIES.map((c) => [c.url, []]));

  const crawler = new PlaywrightCrawler({
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 300,

    preNavigationHooks: [
      async ({ page, request }) => {
        const bucket = collectedByUrl.get(request.url);
        if (!bucket) return;

        page.on('response', async (response) => {
          const url = response.url();
          if (!url.includes('u-search.wb.ru')) return;
          if (response.status() !== 200) return;
          try {
            const json = await response.json();
            const items = json?.products ?? [];
            if (items.length) {
              bucket.push(...items);
            }
          } catch {}
        });
      },
    ],

    async requestHandler({ page, request, log }) {
      const { slug } = request.userData;
      const collected = collectedByUrl.get(request.url) ?? [];

      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Scroll to trigger paginated catalog API calls
      for (let i = 0; i < 30; i++) {
        await page.evaluate(() => window.scrollBy(0, 900));
        await sleep(600);
      }
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

      log.info(`[wb] ${slug} — intercepted ${collected.length} products`);
      if (collected.length === 0) return;

      const ops = collected.map((item) => ({
        updateOne: {
          filter: { _id: `wb:${item.id}` },
          update: {
            $set: {
              _id: `wb:${item.id}`,
              platform: 'wildberries',
              name: item.name,
              brand: item.brand ?? null,
              price_byn: extractPrice(item),
              url: `https://www.wildberries.by/catalog/${item.id}/detail.aspx`,
              category: slug,
              inci: null,
              inci_source: null,
              crawled_at: new Date(),
              enriched_at: null,
            },
          },
          upsert: true,
        },
      }));

      await products.bulkWrite(ops, { ordered: false });
      log.info(`[wb] saved ${ops.length} products for ${slug}`);
    },
  });

  await crawler.run(
    CATEGORIES.map((cat) => ({
      url: cat.url,
      userData: { slug: cat.slug, collected: [] },
    }))
  );
}
