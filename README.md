# Sostav

> **состав** (Russian) — *composition, ingredients*

Find budget-friendly alternatives to luxury cosmetics based on ingredient matching. Sostav crawls Belarusian cosmetics catalogs, enriches products with INCI ingredient data, and uses Claude to match the formula of expensive products against an affordable local index.

## How it works

```
[Nightly crawl]
  Wildberries.by cosmetics catalog  ─┐
  tabletka.by pharmacy catalog       ├──▶ MongoDB Atlas
                                     ┘
[Query time]
  User inputs luxury product name or URL
          ↓
  Claude identifies key INCI actives
          ↓
  Atlas Search: filter by ingredients + price ceiling + platform
          ↓
  Results with real URLs and live prices
```

## Stack

- **Crawler** — Node.js + [Crawlee](https://crawlee.dev/) (HttpCrawler + CheerioCrawler)
- **Database** — MongoDB Atlas free tier + Atlas Search
- **Enrichment** — [Open Beauty Facts](https://world.openbeautyfacts.org/) + Claude API (batch, for unknowns)
- **API** — Express.js
- **Frontend** — Vanilla HTML/JS, no build step
- **Infra** — EC2 t2.micro (crawler + server), cron for nightly crawl

## Project structure

```
sostav/
  crawlers/
    wildberries.js     # Wildberries BY catalog API crawler
    tabletka.js        # tabletka.by pharmacy crawler
  enrichment/
    openbeautyfacts.js # OBF data join by brand + product name
    claude.js          # Claude batch API for products not in OBF
  api/
    search.js          # Express route: POST /api/search
  public/
    index.html         # Frontend
  server.js            # Express app + static file serving
  crawl.js             # Crawl entrypoint (run via cron)
  enrich.js            # Enrichment entrypoint (run after crawl)
  .env.example
```

## Getting started

### Prerequisites

- Node.js 24+
- MongoDB Atlas account (free tier is sufficient)
- Anthropic API key (for enrichment + query-time ingredient resolution)

### Setup

```bash
git clone https://github.com/nebkam/sostav
cd sostav
npm install
cp .env.example .env
# fill in MONGODB_URI and ANTHROPIC_API_KEY in .env
```

### Run the crawler

```bash
node crawl.js
```

Crawls Wildberries BY cosmetics categories and tabletka.by. Stores raw products in MongoDB. Safe to re-run — upserts by platform product ID.

### Run enrichment

```bash
node enrich.js
```

Joins crawled products against the Open Beauty Facts dataset, then calls the Claude Batch API for any products without INCI data. Populates the `inci` field and sets `inci_source`.

### Start the server

```bash
node server.js
# or in production:
pm2 start server.js
```

Serves the frontend at `http://localhost:3000` and the search API at `POST /api/search`.

### Nightly cron (EC2)

```bash
crontab -e
# add:
0 2 * * * cd /home/ec2-user/sostav && node crawl.js >> /var/log/sostav-crawl.log 2>&1
```

## Environment variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `PORT` | Server port (default: 3000) |
| `CRAWL_CONCURRENCY` | Parallel requests during crawl (default: 5) |
| `PRICE_CURRENCY` | Default currency for display (default: BYN) |

## Data model

```js
// products collection
{
  _id: "wb:12345678",           // platform:external_id
  platform: "wildberries",      // wildberries | tabletka
  name: "Librederm Витамин F крем",
  brand: "Librederm",
  price_byn: 12.50,
  url: "https://wildberries.by/catalog/12345678/detail.aspx",
  inci: ["Linoleic Acid", "Panthenol", "Allantoin"],
  inci_source: "openbeautyfacts", // openbeautyfacts | claude | null
  category: "face/moisturiser",
  crawled_at: ISODate,
  enriched_at: ISODate
}
```

## Atlas Search index

Create a search index named `products_search` on the `products` collection via the Atlas UI or CLI:

```json
{
  "mappings": {
    "fields": {
      "name":      [{ "type": "string" }, { "type": "autocomplete" }],
      "brand":     [{ "type": "string" }],
      "inci":      [{ "type": "string" }],
      "price_byn": [{ "type": "number" }],
      "platform":  [{ "type": "string" }]
    }
  }
}
```

## INCI enrichment coverage

| Source | Expected coverage |
|---|---|
| Open Beauty Facts | ~60–70% (strong on EU/CIS brands) |
| Claude batch API | remaining ~30–40% |

OBF enrichment is free and runs locally against their data dump. Claude enrichment uses the Batch API (async, lower cost) for products not matched by OBF.

## License

MIT
