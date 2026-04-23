// Uses the Claude Batch API to get INCI ingredient lists for products not matched by OBF.
// Submits one batch, polls until complete, then writes results back to MongoDB.
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM = `You are a cosmetics formulation expert. Given a product name and brand, respond ONLY with a JSON array of INCI ingredient names for that product, ordered by concentration (highest first). If you don't know the product, return an empty array []. Example: ["Aqua","Glycerin","Niacinamide"]`;

export async function enrichWithClaude(db) {
  const products = db.collection('products');
  const unenriched = await products
    .find({ inci: null })
    .project({ _id: 1, name: 1, brand: 1 })
    .toArray();

  if (unenriched.length === 0) {
    console.log('[claude] nothing to enrich');
    return;
  }

  console.log(`[claude] submitting batch for ${unenriched.length} products…`);

  const requests = unenriched.map((p) => ({
    custom_id: p._id,
    params: {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Brand: ${p.brand ?? 'unknown'}\nProduct: ${p.name}`,
        },
      ],
    },
  }));

  const batch = await client.messages.batches.create({ requests });
  console.log(`[claude] batch id: ${batch.id} — polling…`);

  let status = batch;
  while (status.processing_status !== 'ended') {
    await new Promise((r) => setTimeout(r, 30_000));
    status = await client.messages.batches.retrieve(batch.id);
    console.log(`[claude] batch status: ${status.processing_status}`);
  }

  const ops = [];
  for await (const result of await client.messages.batches.results(batch.id)) {
    if (result.result.type !== 'succeeded') continue;
    const text = result.result.message.content[0]?.text ?? '[]';
    let inci;
    try {
      inci = JSON.parse(text);
    } catch {
      inci = [];
    }
    if (!Array.isArray(inci) || inci.length === 0) continue;

    ops.push({
      updateOne: {
        filter: { _id: result.custom_id },
        update: { $set: { inci, inci_source: 'claude', enriched_at: new Date() } },
      },
    });
  }

  if (ops.length) {
    await products.bulkWrite(ops, { ordered: false });
  }

  console.log(`[claude] enriched ${ops.length} products`);
}
