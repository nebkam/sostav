import 'dotenv/config';
import express from 'express';
import { MongoClient } from 'mongodb';
import searchRouter from './api/search.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();
app.locals.db = db;

app.use('/api/search', searchRouter);

const port = parseInt(process.env.PORT ?? '3000');
app.listen(port, () => console.log(`Sostav running at http://localhost:${port}`));
