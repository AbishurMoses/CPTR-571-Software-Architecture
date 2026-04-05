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

app.get('/health', (req, res) => {
    res.json({
        message: "Backend is working",
        port: PORT
    });
});

app.get('/seed-all-games', async (req, res) => {
    let allGames = [];
    let lastAppId = 0;
    let hasMore = true;
    const STEAM_MAX_LIMIT = 50000
    const MAX_PER_REQUEST = STEAM_MAX_LIMIT;
    const HARDCODED_ID = 1

    try {
        while (hasMore) {
            const url = `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${process.env.STEAM_API_KEY}&include_games=true&max_results=${MAX_PER_REQUEST}&last_appid=${lastAppId}`;

            const response = await fetch(url);
            const data = await response.json();

            const games = data.response?.apps || [];

            if (games.length > 0) {
                allGames.push(...games);

                lastAppId = data.response.last_appid;

                // Have reached the last game
                if (!data.response.have_more_results) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }

            if (allGames.length > 200000) break;
        }

        await req.em.upsertMany('Game', allGames.map(g => ({
            appId: g.appid,
            name: g.name,
            lastModified: g.last_modified
        })));

        let meta = await req.em.findOne(Metadata, { id: HARDCODED_ID });
        if (!meta) {
            meta = req.em.create(Metadata, { lastSyncTimestamp: Math.floor(Date.now() / 1000) });
            req.em.persist(meta);
        } else {
            meta.lastSyncTimestamp = Math.floor(Date.now() / 1000);
        }

        await req.em.flush();

        res.json({
            status: "success",
            total_fetched: allGames.length,
            message: "Full catalog retrieved successfully"
        });

    } catch (error) {
        console.error("Seeding failed:", error);
        res.status(500).json({ error: "Full seeding failed", details: error.message });
    }
});

app.get('/seed-updates', async (req, res) => {
    const em = req.em;
    const now = Math.floor(Date.now() / 1000);
    const HARDCODED_ID = 1
    try {
        let meta = await em.findOne('Metadata', { id: HARDCODED_ID });

        const oneWeek = 7 * 24 * 60 * 60
        const oneWeekAgo = now - oneWeek
        const sinceTimestamp = meta ? meta.lastSyncTimestamp : oneWeekAgo;

        const url = `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${process.env.STEAM_API_KEY}&include_games=true&if_modified_since=${sinceTimestamp}`;

        const response = await fetch(url);
        const data = await response.json();
        const games = data.response?.apps || [];

        if (games.length > 0) {
            await em.upsertMany(Game, games.map(g => ({
                appId: g.appid,
                name: g.name,
                lastModified: g.last_modified,
            })));

            if (!meta) {
                meta = em.create('Metadata', { lastSyncTimestamp: now });
                em.persist(meta);
            } else {
                meta.lastSyncTimestamp = now;
            }

            await em.flush();
        }

        res.json({
            status: "success",
            message: `Synced ${games.length} updates since ${new Date(sinceTimestamp * 1000).toLocaleString()}`,
            count: games.length
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Update fetch failed", details: e.message });
    }
});

app.get('/game/:id', async (req, res) => {
    const appId = req.params.id;
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        const gameData = data[appId];

        if (gameData?.success) {
            res.json({
                name: gameData.data.name,
                description: gameData.data.short_description,
                header_image: gameData.data.header_image,
                developers: gameData.data.developers,
                genres: gameData.data.genres?.map(g => g.description) || [],
                raw: gameData.data
            });
        } else {
            res.status(404).json({ error: "Game not found in Steam storefront" });
        }
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch game details" });
    }
});

app.listen(PORT, () => {
    console.log(`Watching at http://localhost:${PORT}`);
});