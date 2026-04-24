import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { crawlWildberries } from '../crawlers/wildberries.js';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
await crawlWildberries(client.db());
await client.close();
