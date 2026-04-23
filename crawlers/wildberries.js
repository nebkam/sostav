// Crawls Wildberries.by cosmetics catalog via their internal JSON API.
// Each category page returns up to 100 products; we paginate until empty.
import { HttpCrawler } from 'crawlee';

const CATEGORIES = [
  { id: '8422', slug: 'uhod-za-licom' },
  { id: '8418', slug: 'uhod-za-telom' },
  { id: '8419', slug: 'uhod-za-volosami' },
  { id: '8423', slug: 'dekorativnaya-kosmetika' },
  { id: '8420', slug: 'parfyumeriya' },
];

const BASE_URL = 'https://catalog.wb.ru/catalog';

export async function crawlWildberries(db) {
  const products = db.collection('products');

  const crawler = new HttpCrawler({
    maxConcurrency: parseInt(process.env.CRAWL_CONCURRENCY ?? '5'),
    async requestHandler({ request, json }) {
      const { category } = request.userData;
      const items = json?.data?.products ?? [];

      if (items.length === 0) return;

      const ops = items.map((item) => {
        const doc = {
          _id: `wb:${item.id}`,
          platform: 'wildberries',
          name: item.name,
          brand: item.brand,
          price_byn: item.salePriceU / 100,
          url: `https://www.wildberries.by/catalog/${item.id}/detail.aspx`,
          category: category.slug,
          inci: null,
          inci_source: null,
          crawled_at: new Date(),
          enriched_at: null,
        };
        return {
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: doc },
            upsert: true,
          },
        };
      });

      await products.bulkWrite(ops, { ordered: false });
      console.log(`[wildberries] ${category.slug} — saved ${ops.length} products`);
    },
  });

  const requests = [];
  for (const category of CATEGORIES) {
    for (let page = 1; page <= 50; page++) {
      requests.push({
        url: `${BASE_URL}/${category.slug}/catalog?appType=1&curr=byn&dest=-59208&page=${page}&subject=${category.id}&sort=popular&limit=100`,
        userData: { category, page },
      });
    }
  }

  await crawler.run(requests);
}
