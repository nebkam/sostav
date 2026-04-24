// Run: node scripts/probe-wb.js "PASTE_URL_HERE"
// Paste a u-search.wb.ru URL captured from browser DevTools.
// Prints the response shape so you can verify the crawler field mappings.
const url = process.argv[2] ?? 'https://u-search.wb.ru/exactmatch/ru/common/v18/search?ab_testing=false&appType=1&curr=byn&dest=-1257786&lang=ru&locale=ru&query=menu_mined_subject_v2_63002&resultset=catalog&sort=popular&spp=30&suppressSpellcheck=false';


const res = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://www.wildberries.by/',
  },
});

console.log('HTTP', res.status);
const json = await res.json();
console.log('Top-level keys:', Object.keys(json));

const items = json?.data?.products ?? [];
console.log(`\nProducts found: ${items.length}`);

if (items[0]) {
  console.log('\nFirst item keys:', Object.keys(items[0]));
  console.log('\nFirst item:');
  console.log(JSON.stringify(items[0], null, 2).slice(0, 600));
  console.log('\n--- Field check ---');
  console.log('id:         ', items[0].id);
  console.log('name:       ', items[0].name);
  console.log('brand:      ', items[0].brand);
  console.log('salePriceU: ', items[0].salePriceU, '→', items[0].salePriceU / 100, 'BYN');
}
