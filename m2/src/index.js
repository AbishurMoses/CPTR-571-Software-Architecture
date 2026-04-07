import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MikroORM } from '@mikro-orm/postgresql';
import { Game } from './entities/Game.js';
import { Metadata } from './entities/Metadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.dev') });

const app = express();
const PORT = process.env.API_PORT;

// ── Database setup (mirrors M1) ──────────────────────────────────────────────
const orm = await MikroORM.init({
    entities: [Game, Metadata],
    dbName: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    debug: true,
});

await orm.schema.update();

// Attach a fresh Entity Manager to every request
app.use((req, res, next) => {
    req.em = orm.em.fork();
    next();
});

// ── Epic GraphQL helper ───────────────────────────────────────────────────────
// Epic doesn't have an official public API, but their storefront exposes a
// GraphQL endpoint that the website uses.
const EPIC_GRAPHQL_URL = 'https://store.epicgames.com/graphql';

async function fetchEpicGamesPage(cursor = '') {
    const query = `
        query searchStoreQuery($cursor: String) {
            Catalog {
                searchStore(
                    category: "games/edition/base|bundles/games|editors"
                    count: 40
                    after: $cursor
                    sortBy: "releaseDate"
                    sortDir: "DESC"
                    releaseDate: "[2000-01-01,]"
                ) {
                    elements {
                        id
                        title
                        releaseDate
                    }
                    paging {
                        count
                        total
                        pageCount
                    }
                }
            }
        }
    `;

    const response = await fetch(EPIC_GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { cursor } }),
    });

    if (!response.ok) {
        throw new Error(`Epic API responded with ${response.status}`);
    }

    const json = await response.json();
    return json.data?.Catalog?.searchStore;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check — gateway calls this for /health-all
app.get('/health', (req, res) => {
    res.json({
        message: 'Epic Games service is working',
        port: PORT,
    });
});

// Seed all Epic games into the database
// Call this once (or periodically) to populate your DB.
// Usage: GET /seed-all-games
app.get('/seed-all-games', async (req, res) => {
    const HARDCODED_ID = 1;
    let cursor = '';
    let totalFetched = 0;
    let pagesFetched = 0;

    try {
        // Keep fetching pages until Epic has no more results
        while (true) {
            const storeData = await fetchEpicGamesPage(cursor);
            const elements = storeData?.elements || [];

            if (elements.length === 0) break;

            // Map Epic fields
            const games = elements.map(g => ({
                id: g.id,
                name: g.title,
                lastModified: g.releaseDate
                    ? Math.floor(new Date(g.releaseDate).getTime() / 1000)
                    : null,
            }));

            await req.em.upsertMany('Game', games);

            totalFetched += elements.length;
            pagesFetched++;

            // Epic uses cursor-based pagination.
            // pageCount * 40 tells us if there are more pages.
            const { count, total } = storeData.paging;
            if (totalFetched >= total || elements.length < 40) break;

            // Move cursor forward by the number of items fetched so far
            cursor = String(totalFetched);
        }

        // Update sync timestamp
        let meta = await req.em.findOne(Metadata, { id: HARDCODED_ID });
        if (!meta) {
            meta = req.em.create(Metadata, {
                lastSyncTimestamp: Math.floor(Date.now() / 1000),
            });
            req.em.persist(meta);
        } else {
            meta.lastSyncTimestamp = Math.floor(Date.now() / 1000);
        }

        await req.em.flush();

        res.json({
            status: 'success',
            total_fetched: totalFetched,
            pages_fetched: pagesFetched,
            message: 'Full Epic catalog retrieved successfully',
        });
    } catch (error) {
        console.error('Epic seeding failed:', error);
        res.status(500).json({ error: 'Full seeding failed', details: error.message });
    }
});

// Return a paginated list of Epic games from the DB
// Usage: GET /epic-all-games?page=1
// Gateway calls this for /fetch-all-games
app.get('/epic-all-games', async (req, res) => {
    const PAGE_SIZE = 40;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    try {
        const [games, total] = await req.em.findAndCount(
            Game,
            {},
            { limit: PAGE_SIZE, offset }
        );

        res.json({
            page,
            total_pages: Math.ceil(total / PAGE_SIZE),
            total_games: total,
            data: games,
        });
    } catch (error) {
        console.error('Failed to fetch Epic games from DB:', error);
        res.status(500).json({ error: 'Failed to fetch games', details: error.message });
    }
});

// Get details for a single Epic game by its ID
// Usage: GET /game/:id
app.get('/game/:id', async (req, res) => {
    const gameId = req.params.id;

    const query = `
        query getGameDetails($id: String!) {
            Catalog {
                catalogOffer(id: $id, namespace: "epic") {
                    id
                    title
                    description
                    keyImages {
                        type
                        url
                    }
                    seller {
                        name
                    }
                    releaseDate
                }
            }
        }
    `;

    try {
        const response = await fetch(EPIC_GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { id: gameId } }),
        });

        const json = await response.json();
        const offer = json.data?.Catalog?.catalogOffer;

        if (offer) {
            const headerImage = offer.keyImages?.find(img => img.type === 'DieselStoreFrontWide')?.url
                ?? offer.keyImages?.[0]?.url
                ?? null;

            res.json({
                id: offer.id,
                name: offer.title,
                description: offer.description,
                header_image: headerImage,
                developers: offer.seller?.name ? [offer.seller.name] : [],
                releaseDate: offer.releaseDate,
            });
        } else {
            res.status(404).json({ error: 'Game not found in Epic storefront' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch game details', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Epic Games service watching at http://localhost:${PORT}`);
});
