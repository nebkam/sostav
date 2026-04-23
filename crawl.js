import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { crawlWildberries } from './crawlers/wildberries.js';
import { crawlTabletka } from './crawlers/tabletka.js';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();

console.log('=== Sostav crawl started ===');
await crawlWildberries(db);
await crawlTabletka(db);
console.log('=== Crawl complete ===');

await client.close();
