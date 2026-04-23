// Crawls tabletka.by pharmacy cosmetics catalog via HTML scraping.
import { CheerioCrawler } from 'crawlee';

const START_URL = 'https://tabletka.by/catalog/kosmetika-i-gigiena';

export async function crawlTabletka(db) {
  const products = db.collection('products');

  const crawler = new CheerioCrawler({
    maxConcurrency: parseInt(process.env.CRAWL_CONCURRENCY ?? '5'),
    async requestHandler({ request, $, enqueueLinks }) {
      if (request.label === 'LIST') {
        await enqueueLinks({
          selector: 'a.product-card__link',
          label: 'DETAIL',
        });
        await enqueueLinks({
          selector: 'a.pagination__next',
          label: 'LIST',
        });
        return;
      }

      if (request.label === 'DETAIL') {
        const name = $('h1.product-title').text().trim();
        const brand = $('a.product-brand').text().trim();
        const priceText = $('span.price__value').first().text().replace(/\s/g, '').replace(',', '.');
        const price = parseFloat(priceText) || null;

        if (!name || !price) return;

        const doc = {
          _id: `tb:${Buffer.from(request.url).toString('base64').slice(0, 24)}`,
          platform: 'tabletka',
          name,
          brand: brand || null,
          price_byn: price,
          url: request.url,
          category: 'pharmacy/cosmetics',
          inci: null,
          inci_source: null,
          crawled_at: new Date(),
          enriched_at: null,
        };

        await products.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
        console.log(`[tabletka] saved: ${name}`);
      }
    },
  });

  await crawler.run([{ url: START_URL, label: 'LIST' }]);
}
