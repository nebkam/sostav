// Joins products against the Open Beauty Facts JSONL dump.
// Download: https://world.openbeautyfacts.org/data/openfoodfacts-products.jsonl.gz
// We match by brand + name similarity (lowercased, whitespace-normalized).
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import readline from 'readline';
import path from 'path';

const DUMP_PATH = path.resolve('data', 'openbeautyfacts-products.jsonl.gz');

function normalize(str) {
  return (str ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseInci(product) {
  const raw = product.ingredients_text_en ?? product.ingredients_text ?? '';
  if (!raw) return null;
  return raw
    .split(',')
    .map((s) => s.replace(/\*/g, '').trim())
    .filter(Boolean);
}

export async function enrichWithOBF(db) {
  const products = db.collection('products');
  const unenriched = await products
    .find({ inci: null })
    .project({ _id: 1, name: 1, brand: 1 })
    .toArray();

  if (unenriched.length === 0) {
    console.log('[obf] nothing to enrich');
    return;
  }

  // Build a lookup map keyed by "brand|name"
  const lookup = new Map(
    unenriched.map((p) => [`${normalize(p.brand)}|${normalize(p.name)}`, p._id])
  );

  console.log(`[obf] matching ${unenriched.length} products against OBF dump…`);

  let matched = 0;
  const ops = [];

  const rl = readline.createInterface({
    input: createReadStream(DUMP_PATH).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line) continue;
    let obf;
    try {
      obf = JSON.parse(line);
    } catch {
      continue;
    }

    const key = `${normalize(obf.brands)}|${normalize(obf.product_name)}`;
    const id = lookup.get(key);
    if (!id) continue;

    const inci = parseInci(obf);
    if (!inci?.length) continue;

    ops.push({
      updateOne: {
        filter: { _id: id },
        update: { $set: { inci, inci_source: 'openbeautyfacts', enriched_at: new Date() } },
      },
    });
    lookup.delete(key);
    matched++;

    if (ops.length >= 500) {
      await products.bulkWrite(ops.splice(0), { ordered: false });
    }
  }

  if (ops.length) await products.bulkWrite(ops, { ordered: false });

  console.log(`[obf] matched and enriched ${matched} products`);
}
