# Musician Daily Deals API

A high-performance Fastify-based TypeScript server that scrapes multiple music retailers' daily deals and exposes them as a clean JSON API with built-in caching.

## Features

- 🚀 Built with **Fastify** for high performance
- 📘 Written in **TypeScript** for type safety
- 🕷️ Multi-retailer web scraping (Guitar Center, Musician's Friend, etc.)
- 💾 Built-in **node-cache** for intelligent caching
- 🏗️ Modular architecture with scraper implementations layer
- 📦 Clean JSON API responses with discount calculations
- 🏥 Health check and cache management endpoints
- 📝 Logging with Pino

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd DailyDealsAPI
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional):
```bash
cp .env.example .env
```

## Development

Start the development server with hot reload:
```bash
npm run dev
```

The server will be available at `http://localhost:3000`

**API Documentation:** `http://localhost:3000/documentation`

## Production

1. Build the project:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

## API Documentation

**Interactive API Documentation:** Visit `http://localhost:3000/documentation` in your browser to explore and test all endpoints with Swagger UI.

The API follows OpenAPI 3.0 specification with full schema documentation for all endpoints.

## API Endpoints

### Info & Health

#### `GET /`
Returns API information and available endpoints.

#### `GET /health`
Returns server health status and uptime.

```json
{
  "status": "ok",
  "timestamp": "2026-06-26T12:00:00.000Z",
  "uptime": 123.45
}
```

### Deals

#### `GET /api/retailers`
Get list of available retailers.

```json
{
  "success": true,
  "count": 2,
  "retailers": ["guitar center", "musician's friend"],
  "timestamp": "2026-06-26T12:00:00.000Z"
}
```

#### `GET /api/deals`
Get all deals from all retailers (with caching).

```json
{
  "success": true,
  "timestamp": "2026-06-26T12:00:00.000Z",
  "dealCount": 42,
  "deals": [
    {
      "id": "guitar center-1719410400000-a1b2c3d4e",
      "retailer": "Guitar Center",
      "title": "Fender Stratocaster",
      "price": "$299.99",
      "originalPrice": "$599.99",
      "discount": "$300.00",
      "discountPercent": 50,
      "url": "https://www.guitarcenter.com/...",
      "image": "https://...",
      "description": "Classic electric guitar",
      "scrapedAt": "2026-06-26T12:00:00.000Z"
    }
  ]
}
```

#### `GET /api/deals/:retailer`
Get deals from a specific retailer.

```
GET /api/deals/guitar%20center
```

### Cache Management

#### `GET /api/cache`
Get cache statistics.

```json
{
  "success": true,
  "timestamp": "2026-06-26T12:00:00.000Z",
  "stats": {
    "keys": 2,
    "ksize": 50,
    "vsize": 1500
  }
}
```

#### `POST /api/cache/clear`
Clear all cached deals.

#### `POST /api/cache/clear/:retailer`
Clear cache for a specific retailer.

## Architecture

### Modular Design

1. **Scrapers Layer** (`src/scrapers/`)

## Project Structure

```
DailyDealsAPI/
├── src/
│   ├── index.ts                    # Main Fastify server
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces (Deal, ScraperResult)
│   ├── scrapers/
│   │   ├── base.ts                 # Abstract BaseScraper class
│   │   ├── guitar-center.ts        # Guitar Center scraper implementation
│   │   └── musicians-friend.ts     # Musician's Friend scraper implementation
│   ├── cache/
│   │   ├── cache.ts                # CacheService (node-cache wrapper)
│   │   └── scraper-manager.ts      # ScraperManager (orchestrates scrapers + caching)
│   └── routes/
│       ├── health.ts               # Health & info endpoints
│       ├── deals.ts                # Deals endpoints
│       └── cache.ts                # Cache management endpoints
├── dist/                           # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Architecture

### Modular Design

1. **Scrapers Layer** (`src/scrapers/`)
   - Abstract `BaseScraper` class with common utilities
   - Retailer-specific implementations (GuitarCenterScraper, MusiciansFreeScraper)
   - Easy to add new retailers

2. **Cache Layer** (`src/cache/`)
   - `CacheService`: node-cache wrapper with TTL support
   - `ScraperManager`: Orchestrates all scrapers and handles caching logic

3. **Routes Layer** (`src/routes/`)
   - `health.ts`: Server status endpoints
   - `deals.ts`: Deals data endpoints
   - `cache.ts`: Cache management endpoints

4. **Types** (`src/types/`)
   - Shared TypeScript interfaces
   - `Deal` and `ScraperResult` types

## Configuration

Environment variables (see `.env.example`):
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `CACHE_TTL` - Cache time-to-live in seconds (default: 600)
- `DEBUG` - Enable debug mode (default: false)

## How It Works

1. **Request**: Client calls `/api/deals` or `/api/deals/:retailer`
2. **Cache Check**: ScraperManager checks if data is cached
3. **Scraping**: If not cached, fetches and parses HTML using Cheerio
4. **Caching**: Results are stored in node-cache with TTL
5. **Response**: Returns structured JSON with all deals

## Adding New Retailers

1. Create a new scraper in `src/scrapers/`:

```typescript
import { BaseScraper } from "./base.js";
import { Deal } from "../types/index.js";

export class NewRetailerScraper extends BaseScraper {
  retailer = "New Retailer";

  async scrape(): Promise<Deal[]> {
    // Implementation here
  }
}
```

2. Register in `src/cache/scraper-manager.ts`:

```typescript
this.registerScraper(new NewRetailerScraper());
```

## Caching

### How Caching Works

- Each retailer's deals are cached separately with a configurable TTL
- Default TTL: 600 seconds (10 minutes)
- Cache is checked before scraping; if valid data exists, it's returned immediately
- Cache can be manually cleared via API endpoints

### Cache Benefits

- ⚡ Faster responses for repeated requests
- 📉 Reduced load on external websites
- 🛡️ Better resilience (stale data better than no data)
- 💾 Minimal memory usage (in-process, configurable TTL)

## Troubleshooting

### "Scraper not found" Error
- Check available retailers: `GET /api/retailers`
- Ensure retailer name matches exactly

### "Failed to fetch deals" Error
- Website structure may have changed
- Update CSS selectors in the corresponding scraper file
- Check network connectivity

### Cache Not Working
- Check cache stats: `GET /api/cache`
- Clear cache: `POST /api/cache/clear`
- Verify `CACHE_TTL` environment variable

## Deployment

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Environment Variables
Set these on your deployment platform:
- `PORT` (default: 3000)
- `CACHE_TTL` (default: 600)

## License

MIT
