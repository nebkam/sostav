import { PlaywrightCrawler, sleep } from 'crawlee';

// Parent "blackhole" categories on WB are tile-navigation pages that never fire
// the product search API. Only leaf categories (specific shards) do. The lists
// below are derived from static-basket-01.wbbasket.ru/vol0/data/main-menu-by-ru-v3.json
const CATEGORIES = [
  // ── Уход за лицом ──────────────────────────────────────────────────
  { url: 'https://www.wildberries.by/catalog/krasota/uhod-za-kozhey/uhod-za-litsom',   slug: 'uhod-za-litsom'   },
  // ── Уход за телом ──────────────────────────────────────────────────
  { url: 'https://www.wildberries.by/catalog/krasota/uhod-za-kozhey/uhod-za-telom',    slug: 'uhod-za-telom'    },
  // ── Волосы ─────────────────────────────────────────────────────────
  { url: 'https://www.wildberries.by/catalog/krasota/volosy/uhod-za-volosami',          slug: 'uhod-za-volosami' },
  { url: 'https://www.wildberries.by/catalog/krasota/volosy/shampuni-i-konditsionery', slug: 'shampuni'         },
  // ── Макияж (parent=blackhole → leaf sub-categories) ────────────────
  { url: 'https://www.wildberries.by/catalog/krasota/makiyazh/litso',                   slug: 'makiyazh-litso'   },
  { url: 'https://www.wildberries.by/catalog/krasota/makiyazh/guby',                    slug: 'makiyazh-guby'    },
  { url: 'https://www.wildberries.by/catalog/krasota/makiyazh/glaza',                   slug: 'makiyazh-glaza'   },
  // ── Аптека ─────────────────────────────────────────────────────────
  { url: 'https://www.wildberries.by/catalog/krasota/aptechnaya-kosmetika',             slug: 'apteka'           },
  // ── Парфюмерия — женская (parent=blackhole → leaf scent types) ─────
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/tsvetochnye', slug: 'parfyum-zh-tsvetochnye' },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/fruktovye',   slug: 'parfyum-zh-fruktovye'   },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/vostochnye',  slug: 'parfyum-zh-vostochnye'  },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/ambrovye',    slug: 'parfyum-zh-ambrovye'    },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/drevesnye',   slug: 'parfyum-zh-drevesnye'   },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/pudrovye',    slug: 'parfyum-zh-pudrovye'    },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/zelenye',     slug: 'parfyum-zh-zelenye'     },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/tsitrusovye', slug: 'parfyum-zh-tsitrusovye' },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/kozhanye',    slug: 'parfyum-zh-kozhanye'    },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/fuzhernye',   slug: 'parfyum-zh-fuzhernye'   },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/shiprovye',   slug: 'parfyum-zh-shiprovye'   },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/zhenskie-aromaty/prochie',     slug: 'parfyum-zh-prochie'     },
  // ── Парфюмерия — мужская ───────────────────────────────────────────
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/drevesnye',   slug: 'parfyum-m-drevesnye'    },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/vostochnye',  slug: 'parfyum-m-vostochnye'   },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/ambrovye',    slug: 'parfyum-m-ambrovye'     },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/tsvetochnye', slug: 'parfyum-m-tsvetochnye'  },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/fruktovye',   slug: 'parfyum-m-fruktovye'    },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/fuzhernye',   slug: 'parfyum-m-fuzhernye'    },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/zelenye',     slug: 'parfyum-m-zelenye'      },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/tsitrusovye', slug: 'parfyum-m-tsitrusovye'  },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/kozhanye',    slug: 'parfyum-m-kozhanye'     },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/pudrovye',    slug: 'parfyum-m-pudrovye'     },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/shiprovye',   slug: 'parfyum-m-shiprovye'    },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/muzhskie-aromaty/prochie',     slug: 'parfyum-m-prochie'      },
  // ── Парфюмерия — прочее ────────────────────────────────────────────
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/aromaty-uniseks',              slug: 'parfyum-uniseks'        },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/detskie-aromaty',              slug: 'parfyum-detskie'        },
  { url: 'https://www.wildberries.by/catalog/krasota/parfyumeriya/parfyumernye-nabory',          slug: 'parfyum-nabory'         },
];

function extractPrice(item) {
  const price = item.sizes?.[0]?.price;
  if (!price) return 0;
  return ((price.product || price.basic) ?? 0) / 100;
}

export async function crawlWildberries(db) {
  const products = db.collection('products');

  // Module-level maps avoid Crawlee deep-cloning userData
  const collectedByUrl = new Map(CATEGORIES.map((c) => [c.url, []]));
  const apiUrlByUrl    = new Map(CATEGORIES.map((c) => [c.url, null]));

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

          if (!apiUrlByUrl.get(request.url)) {
            apiUrlByUrl.set(request.url, url);
          }

          try {
            const json = await response.json();
            const items = json?.products ?? [];
            if (items.length) bucket.push(...items);
          } catch {}
        });
      },
    ],

    async requestHandler({ page, request, log }) {
      const { slug } = request.userData;
      const collected = collectedByUrl.get(request.url) ?? [];

      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      let apiUrl = apiUrlByUrl.get(request.url);
      if (!apiUrl) {
        // Some pages need extra time for the WASM app to initialize before firing the API
        await page.evaluate(() => window.scrollBy(0, 300));
        await sleep(5000);
        apiUrl = apiUrlByUrl.get(request.url);
      }

      if (!apiUrl) {
        log.warning(`[wb] ${slug} — no API URL captured, skipping`);
        return;
      }

      log.info(`[wb] ${slug} — page 1: ${collected.length} products (intercepted)`);

      for (let pageNum = 2; ; pageNum++) {
        const fetchUrl = (() => {
          const u = new URL(apiUrl);
          u.searchParams.set('page', String(pageNum));
          return u.toString();
        })();

        const result = await page.evaluate(async (url) => {
          try {
            const resp = await fetch(url);
            if (!resp.ok) return { status: resp.status };
            const json = await resp.json();
            return { status: resp.status, data: json };
          } catch (e) {
            return { status: 0, error: String(e) };
          }
        }, fetchUrl);

        if (result.status === 429) {
          log.warning(`[wb] ${slug} — 429 on page ${pageNum}, stopping`);
          break;
        }
        if (result.error || !result.data) {
          log.warning(`[wb] ${slug} — error on page ${pageNum}: ${result.error ?? result.status}`);
          break;
        }

        const items = result.data?.products ?? [];
        if (items.length === 0) {
          log.info(`[wb] ${slug} — empty response on page ${pageNum}, done paginating`);
          break;
        }

        collected.push(...items);
        log.info(`[wb] ${slug} — page ${pageNum}: +${items.length} products (total: ${collected.length})`);
        await sleep(1500);
      }

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
    CATEGORIES.map((c) => ({
      url: c.url,
      userData: { slug: c.slug },
    }))
  );
}
