import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const client = new Anthropic();

const SYSTEM = `You are a cosmetics ingredient expert. Given a luxury product name or URL, identify the key INCI active ingredients that define its efficacy (not water, fillers, or preservatives). Respond ONLY with a JSON array of INCI names, e.g. ["Retinol","Hyaluronic Acid","Niacinamide"]. Max 10 ingredients.`;

router.post('/', async (req, res) => {
  const { query, max_price_byn, platform } = req.body;

  if (!query?.trim()) {
    return res.status(400).json({ error: 'query is required' });
  }

  // Step 1: extract key actives from user query
  let actives;
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM,
      messages: [{ role: 'user', content: query }],
    });
    actives = JSON.parse(msg.content[0].text);
    if (!Array.isArray(actives) || actives.length === 0) throw new Error('empty');
  } catch {
    return res.status(422).json({ error: 'Could not identify actives for this product' });
  }

  // Step 2: Atlas Search — match by inci ingredients
  const db = req.app.locals.db;
  const must = actives.slice(0, 5).map((a) => ({
    text: { query: a, path: 'inci' },
  }));

  const pipeline = [
    {
      $search: {
        index: 'products_search',
        compound: {
          should: must,
          minimumShouldMatch: Math.max(1, Math.floor(must.length / 2)),
        },
      },
    },
    { $addFields: { score: { $meta: 'searchScore' } } },
  ];

  if (max_price_byn) {
    pipeline.push({ $match: { price_byn: { $lte: parseFloat(max_price_byn) } } });
  }
  if (platform) {
    pipeline.push({ $match: { platform } });
  }

  pipeline.push({ $sort: { score: -1, price_byn: 1 } });
  pipeline.push({ $limit: 20 });
  pipeline.push({
    $project: { _id: 1, name: 1, brand: 1, price_byn: 1, url: 1, platform: 1, inci: 1, score: 1 },
  });

  const results = await db.collection('products').aggregate(pipeline).toArray();

  res.json({ actives, results });
});

export default router;
