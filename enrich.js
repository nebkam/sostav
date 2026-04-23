import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { enrichWithOBF } from './enrichment/openbeautyfacts.js';
import { enrichWithClaude } from './enrichment/claude.js';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();

console.log('=== Sostav enrichment started ===');
await enrichWithOBF(db);
await enrichWithClaude(db);
console.log('=== Enrichment complete ===');

await client.close();
