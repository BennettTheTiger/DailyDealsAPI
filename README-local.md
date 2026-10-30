# Raspberry Pi + cron setup

This project can run directly on a Raspberry Pi or other home machine without Docker.

## 1) Configure environment

Create a `.env` file in the project root with:

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=DealCluster
MONGODB_DB_NAME=daily_deals
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-id/your-webhook-token
SCRAPE_FAILURE_STATE_FILE=/path/to/DailyDealsAPI/data/scrape-failures.json
```

For a local MongoDB instance, use:

```dotenv
MONGODB_URI=mongodb://mongo:27017/daily_deals
MONGODB_DB_NAME=daily_deals
```

## 2) Install and build on the Pi

Install Node.js 18 or newer, then run:

```bash
npm ci
npm run build
```

Before the first scrape or API start, run `npm run db:setup` with a database
user that has `readWrite` on `daily_deals` (or your configured database).
This creates the unique deal ID and newest-deal sort indexes for both retailers.
Restore your runtime credentials afterward: reads only need `read`, while
scrape persistence needs `readWrite`. The API's scrape fallback also needs write
access to persist deals. Neither reads nor scrape writes perform index setup.
Rerun setup after index changes; it is safe to rerun with the same indexes.
For legacy non-unique deal ID indexes, setup retains only the newest duplicate
record by `scrapedAt`, so back up existing data before migrating.

## 3) Check the API (optional)

```bash
curl http://localhost:3000/health
```

## 4) Run the scraper manually

```bash
npm run scrape
```

## 5) Schedule the Pi to run the scrape hourly

This project is designed to run hourly on the Pi.

Open the Pi crontab:

```bash
crontab -e
```

Add this line:

```cron
0 * * * * cd /path/to/DailyDealsAPI && /usr/bin/node dist/cli/scrape.js >> /tmp/daily-deals.log 2>&1
```

The `cd` is important because dotenv and the default failure-state path are relative to the project directory. Build again after code changes with `npm run build`.

## 6) Configure Discord scrape alerts

Create a Discord webhook for the channel where alerts should appear and add its URL to `.env` as `DISCORD_WEBHOOK_URL`.

The scraper sends one alert after four consecutive failures for a retailer. Further failures do not repeat the alert. A successful scrape sends a recovery message and resets that retailer's counter. Failure state is stored in `data/scrape-failures.json`, which remains on the Pi between cron runs and reboots.

The scraper stores one record per deal per calendar day in two MongoDB collections: `guitar_center` and `musicians_friend`. Each record is upserted by `dealId` and `scrapeDate`, so repeated hourly runs do not duplicate that day's data while daily history is retained. MongoDB determines whether a deal has ever been seen; only first-seen deals are appended to Google Sheets. The API reads only the newest daily snapshot for each retailer.

## 7) Export retailer-specific CSV files for Google Sheets

This project can also export a CSV for each retailer so you can import the data into separate tabs in one Google Sheet.

Run:

```bash
npm run export:deals
```

This creates files in the `exports/` folder, such as:

- `guitar-center.csv`
- `musicians-friend.csv`
- `all-deals.csv`

Then in Google Sheets:

1. Open a sheet
2. Create tabs named `Guitar Center` and `Musician's Friend`
3. Import each CSV into its matching tab
4. Use the `scrapedAt` column to track history over time

This gives you a clean one-sheet, two-tab setup without mixing retailer data together.
