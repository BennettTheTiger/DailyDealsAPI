# Local Docker + cron setup

This project can run as a local Docker service on a Raspberry Pi or other home machine.

## 1) Configure environment

Create a `.env` file in the project root with:

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=DealCluster
MONGODB_DB_NAME=daily_deals
MONGODB_COLLECTION=deals
```

For a local MongoDB instance, use:

```dotenv
MONGODB_URI=mongodb://mongo:27017/daily_deals
MONGODB_DB_NAME=daily_deals
MONGODB_COLLECTION=deals
```

## 2) Start the app on the Pi

This compose file is intentionally Atlas-only. There is no local MongoDB container in it, because the app connects directly to MongoDB Atlas.

```bash
docker compose -f docker-compose.local.yml up -d --build
```

## 3) Check the API

```bash
curl http://localhost:3000/health
```

## 4) Run the scraper manually

```bash
docker compose -f docker-compose.local.yml exec app npm run scrape
```

## 5) Schedule the Pi to run the scrape once per day

This project is designed to run once daily at 1:00 AM local time on the Pi.

Open the Pi crontab:

```bash
crontab -e
```

Add this line:

```cron
0 1 * * * cd /path/to/DailyDealsAPI && npm run scrape >> /tmp/daily-deals.log 2>&1
```

If you prefer to run the containerized version directly:

```cron
0 1 * * * docker compose -f /path/to/DailyDealsAPI/docker-compose.local.yml exec -T app npm run scrape >> /tmp/daily-deals.log 2>&1
```

This runs the scrape every day at 1:00 AM on the Pi itself, which keeps it simple and avoids GitHub-hosted runner networking issues.
