# M2 — Epic Games Microservice

## Overview
M2 is an Express + MikroORM microservice that serves Epic Games Store data including game details, pricing, and critic reviews. It runs on port 5000 and connects to its own PostgreSQL database.

## Data Source
Game data and pricing is sourced directly from the Epic Games Store via their GraphQL API, accessed through a local Puppeteer-based seeder script. Review data (user ratings and critic scores) comes from the IGDB API (owned by Twitch), matched by game name.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check — used by gateway |
| GET | `/epic-all-games?page=N` | Paginated list of Epic games (40 per page) |
| GET | `/game/:id` | Full details for a single game |
| GET | `/game/:id/reviews` | IGDB user and critic ratings for a single game |
| GET | `/prefetch-reviews` | Randomly picks Epic games with review data and stores them in a pool |
| GET | `/random-review?count=N` | Returns N random games from the prefetch pool with header images |

## Seeding

> **Important:** Game seeding must be run locally on your machine (not inside Docker). Epic's API blocks requests from server/Docker IPs. The game seeder uses Puppeteer (real Chrome browser) to bypass this. The review seeder uses IGDB and does not require a browser.

### Prerequisites
In the `m2/scripts/` folder, install dependencies:
```bash
npm install puppeteer pg
```
Make sure Docker is running with M2 active:
```bash
docker compose up m2 m2-db
```

### Step 1 — Seed Games
Seeds all Epic Games Store titles (prices, descriptions, images, etc.) into the DB.
```bash
# From the m2/scripts/ folder:
run-seed.bat                 # Windows (automated, keeps re-running until done)
node seed-epic-browser.mjs   # Single run
```
Progress is saved to `seed-progress.json`. If interrupted, just re-run and it resumes automatically. Delete `seed-progress.json` if you want to start fresh.

### Step 2 — Seed Reviews
Seeds IGDB user ratings and critic scores for every game in the DB. Run this **after** Step 1 is complete. No browser needed — runs directly against the IGDB API.

Fill in your Twitch credentials at the top of `seed-reviews.mjs` before running:
```js
const TWITCH_CLIENT_ID = 'your_client_id';
const TWITCH_CLIENT_SECRET = 'your_client_secret';
```
Get free credentials at https://dev.twitch.tv/console.

```bash
# From the m2/scripts/ folder:
run-seed-reviews.bat         # Windows (automated, keeps re-running until done)
node seed-reviews.mjs        # Single run
```
Progress is saved to `review-progress.json`. Delete it if you want to start fresh.

### Step 3 — Prefetch Reviews for Game
Once both seeders are done, populate the review pool used by the game:
```
GET http://localhost:5000/prefetch-reviews
```
Run this once. Then the game can call `/random-review?count=2` to get random games to compare.

### Resetting the Database
To wipe and start fresh:
```bash
sudo docker exec -it cptr-571-software-architecture-m2-db-1 psql -U user_dev -d db -c "DROP TABLE IF EXISTS game; DROP TABLE IF EXISTS review; DROP TABLE IF EXISTS metadata; DROP TABLE IF EXISTS prefetch_review;"
```
Then delete `seed-progress.json` and `review-progress.json` before re-running the seeders.

## Database Schema

### `game` table
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR | Epic offer ID (primary key) |
| name | VARCHAR | Game title |
| namespace | VARCHAR | Epic sandbox/namespace ID |
| last_modified | INT | Unix timestamp of release date |
| description | TEXT | Game description |
| header_image | TEXT | URL of wide store image |
| developer | VARCHAR | Developer display name |
| publisher | VARCHAR | Publisher display name |
| original_price | INT | Price in cents (e.g. 999 = $9.99) |
| discount_price | INT | Discounted price in cents |
| currency_code | VARCHAR | e.g. "USD" |
| price_formatted | VARCHAR | e.g. "$9.99" |
| discount_price_formatted | VARCHAR | e.g. "$4.99" |

### `review` table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Auto-increment primary key |
| game_id | VARCHAR | Links to game.id |
| igdb_rating | NUMERIC | IGDB user rating (0-100) |
| igdb_rating_count | NUMERIC | Number of user ratings |
| igdb_aggregated_rating | NUMERIC | IGDB critic score (0-100) |
| igdb_aggregated_rating_count | NUMERIC | Number of critic reviews |

### `prefetch_review` table
| Column | Type | Description |
|--------|------|-------------|
| game_id | VARCHAR | Primary key — links to game.id |
| title | VARCHAR | Game title |
| market | VARCHAR | Always "epic" |
| total_reviews | INT | Number of IGDB user ratings |
| positive_reviews | INT | Derived from IGDB rating score |