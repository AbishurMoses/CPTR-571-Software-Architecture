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

app.use((req, res, next) => {
    req.em = orm.em.fork();
    next();
});

// ── IGDB / Twitch auth ────────────────────────────────────────────────────────
// IGDB is a free game database owned by Twitch.
// It has an "external_games" table that maps games to their Epic store IDs.
// Credentials come from dev.twitch.tv — set these in your .env.dev:
//   TWITCH_CLIENT_ID=your_client_id
//   TWITCH_CLIENT_SECRET=your_client_secret

let igdbToken = null;
let igdbTokenExpiry = 0;

async function getIGDBToken() {
    // Reuse token if still valid
    if (igdbToken && Date.now() < igdbTokenExpiry) {
        return igdbToken;
    }

    const res = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
        { method: 'POST' }
    );

    if (!res.ok) {
        throw new Error(`Failed to get IGDB token: ${res.status} — check your TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env.dev`);
    }

    const data = await res.json();
    igdbToken = data.access_token;
    igdbTokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 1 min early
    return igdbToken;
}

// Fetch one page of Epic Games Store entries from IGDB
// category 26 = Epic Games Store
async function fetchEpicGamesPage(offset = 0) {
    const token = await getIGDBToken();

    const response = await fetch('https://api.igdb.com/v4/external_games', {
        method: 'POST',
        headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain',
        },
        body: `fields uid, name, game, updated_at, category;
               where category = 26;
               limit 500;
               offset ${offset};
               sort updated_at desc;`,
    });

    if (!response.ok) {
        throw new Error(`IGDB API responded with ${response.status}`);
    }

    return await response.json();
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
// Call this once to populate your DB, then use /epic-all-games to serve data
// Usage: GET /seed-all-games
app.get('/seed-all-games', async (req, res) => {
    const HARDCODED_ID = 1;
    const PAGE_SIZE = 500;
    let offset = 0;
    let totalFetched = 0;

    try {
        while (true) {
            const entries = await fetchEpicGamesPage(offset);

            if (!entries || entries.length === 0) break;

            const games = entries.map(g => ({
                id: g.uid,        // Epic's store ID for the game
                name: g.name,
                lastModified: g.updated_at ?? null,
            }));

            await req.em.upsertMany('Game', games);

            totalFetched += entries.length;
            console.log(`Seeded ${totalFetched} Epic games so far...`);

            // IGDB returns fewer than PAGE_SIZE when we've hit the end
            if (entries.length < PAGE_SIZE) break;

            offset += PAGE_SIZE;
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
            message: 'Full Epic catalog retrieved successfully',
        });
    } catch (error) {
        console.error('Epic seeding failed:', error);
        res.status(500).json({ error: 'Full seeding failed', details: error.message });
    }
});

// Return a paginated list of Epic games from the DB
// Usage: GET /epic-all-games?page=1
// This is what the gateway calls for /fetch-all-games
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
    const epicId = req.params.id;

    try {
        const token = await getIGDBToken();

        // Step 1: find the IGDB game ID from the Epic store ID
        const extRes = await fetch('https://api.igdb.com/v4/external_games', {
            method: 'POST',
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'text/plain',
            },
            body: `fields uid, name, game; where category = 26 & uid = "${epicId}"; limit 1;`,
        });

        const extData = await extRes.json();

        if (!extData || extData.length === 0) {
            return res.status(404).json({ error: 'Game not found in Epic store' });
        }

        const igdbGameId = extData[0].game;

        // Step 2: fetch full game details using the IGDB game ID
        const gameRes = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'text/plain',
            },
            body: `fields name, summary, cover.url, involved_companies.company.name, genres.name, first_release_date;
                   where id = ${igdbGameId};
                   limit 1;`,
        });

        const gameData = await gameRes.json();
        const game = gameData[0];

        if (!game) {
            return res.status(404).json({ error: 'Game details not found' });
        }

        res.json({
            id: epicId,
            name: game.name,
            description: game.summary ?? null,
            // IGDB returns small thumbnails by default — replace with big cover
            header_image: game.cover?.url?.replace('t_thumb', 't_cover_big') ?? null,
            developers: game.involved_companies?.map(ic => ic.company.name) ?? [],
            genres: game.genres?.map(g => g.name) ?? [],
            releaseDate: game.first_release_date
                ? new Date(game.first_release_date * 1000).toISOString()
                : null,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch game details', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Epic Games service watching at http://localhost:${PORT}`);
});