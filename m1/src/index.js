import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MikroORM } from '@mikro-orm/postgresql';
import { Game } from './entities/Game.js';
import { Metadata } from './entities/Metadata.js';
import { Review } from './entities/Review.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.dev') });

const app = express();
const PORT = process.env.API_PORT;

const orm = await MikroORM.init({
    entities: [Game, Metadata, Review],
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

// Steam content descriptor IDs we want to exclude:
//   1 = Some Nudity or Sexual Content
//   3 = Adult Only Sexual Content
//   4 = Frequent Nudity or Sexual Content
const ADULT_DESCRIPTOR_IDS = new Set([1, 3, 4]);

// Cheap pre-filter on obviously NSFW titles so we don't waste an appdetails call.
const ADULT_NAME_PATTERNS = [
    /\bhentai\b/i,
    /\bnsfw\b/i,
    /\bwaifu\b/i,
    /\becchi\b/i,
    /\bxxx\b/i,
    /\beroge\b/i,
    /\badult\b/i,
];

function hasAdultName(name) {
    if (!name) return false;
    return ADULT_NAME_PATTERNS.some((re) => re.test(name));
}

async function isAdultGame(appId) {
    try {
        const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic,content_descriptors`;
        const response = await fetch(url);
        const data = await response.json();
        const entry = data?.[appId];
        if (!entry?.success) return false;

        const ids = entry.data?.content_descriptors?.ids || [];
        if (ids.some((id) => ADULT_DESCRIPTOR_IDS.has(id))) return true;

        // Steam flags some adult-only titles with required_age >= 18
        if (Number(entry.data?.required_age) >= 18) return true;

        return false;
    } catch {
        // If we can't verify, err on the safe side and treat as adult
        return true;
    }
}

app.get('/health', (req, res) => {
    res.json({
        message: "Steam API is working",
        port: PORT
    });
});

// Fetch all game ids
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

// get info on game by id
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

// get review for game by id
app.get('/review/:id', async (req, res) => {
    const appId = req.params.id;
    const cursor = req.query.cursor || '*';
    const encodedCursor = encodeURIComponent(cursor);

    const url = `https://store.steampowered.com/appreviews/${appId}?json=1&cursor=${encodedCursor}&num_per_page=20&language=all`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.success === 1) {
            const summary = data.query_summary;

            const totalReviews = summary?.total_reviews || 0;
            const totalPositive = summary?.total_positive || 0;
            const positivePercentage = totalReviews > 0
                ? ((totalPositive / totalReviews) * 100).toFixed(2)
                : 0;

            res.json({
                score_description: summary?.review_score_desc || "No reviews yet",
                positive_percentage: Number(positivePercentage),
                total_reviews: totalReviews,
                total_positive: totalPositive,
                total_negative: summary?.total_negative || 0,
                next_cursor: data.cursor,
                reviews: data.reviews ? data.reviews.map(r => ({
                    text: r.review,
                    is_positive: r.voted_up,
                    author_playtime: r.author?.playtime_forever
                })) : []
            });
        } else {
            res.status(404).json({ error: "Steam API failed to return review data" });
        }
    } catch (e) {
        console.error("Review Fetch Error:", e);
        res.status(500).json({ error: "Server error fetching reviews" });
    }
});

// --- FROM DB --- //
app.get('/steam-all-games', async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;

    try {
        const [games, total] = await req.em.findAndCount(Game, {}, { limit, offset, orderBy: { appId: 'ASC' } });

        res.json({
            page,
            total_pages: Math.ceil(total / limit),
            total_games: total,
            data: games
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch games", details: error.message });
    }
});

app.get('/prefetch-reviews', async (req, res) => {
    const TARGET = 100;
    const MIN_REVIEWS = 10;
    const MAX_ATTEMPTS = 50;
    const em = req.em;

    try {
        const totalGames = await em.count(Game);
        if (totalGames === 0) {
            return res.status(400).json({
                error: 'No games in database. Run /seed-all-games first.'
            });
        }

        const pickedThisRequest = new Set();
        const results = [];

        for (let i = 0; i < TARGET; i++) {
            let stored = null;

            for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                const offset = Math.floor(Math.random() * totalGames);
                const [candidate] = await em.find(Game, {}, { limit: 1, offset });
                if (!candidate) continue;
                if (pickedThisRequest.has(candidate.appId)) continue;

                // Cheap name filter first
                if (hasAdultName(candidate.name)) continue;

                const exists = await em.findOne(Review, { gameId: candidate.appId });
                if (exists) continue;

                pickedThisRequest.add(candidate.appId);

                // Authoritative check against Steam's content descriptors
                if (await isAdultGame(candidate.appId)) continue;

                let data;
                try {
                    const url = `https://store.steampowered.com/appreviews/${candidate.appId}?json=1&language=all&purchase_type=all`;
                    const response = await fetch(url);
                    data = await response.json();
                } catch (fetchErr) {
                    continue;
                }

                if (!data || data.success !== 1) continue;

                const summary = data.query_summary || {};
                const totalReviews = summary.total_reviews ?? 0;
                const positiveReviews = summary.total_positive ?? 0;

                if (totalReviews < MIN_REVIEWS) continue;

                const review = em.create(Review, {
                    gameId: candidate.appId,
                    title: candidate.name,
                    totalReviews,
                    market: 'steam',
                    positiveReviews,
                });
                em.persist(review);

                stored = {
                    gameId: candidate.appId,
                    title: candidate.name,
                    market: 'steam',
                    totalReviews,
                    positiveReviews,
                };
                break;
            }

            if (stored) {
                results.push(stored);
            } else {
                results.push({
                    error: `Could not find a qualifying game (>= ${MIN_REVIEWS} reviews) after ${MAX_ATTEMPTS} attempts`
                });
            }
        }

        await em.flush();

        res.json({
            status: 'success',
            requested: TARGET,
            stored: results.filter(r => !r.error).length,
            results
        });
    } catch (error) {
        console.error('Prefetch reviews failed:', error);
        res.status(500).json({ error: 'Prefetch reviews failed', details: error.message });
    }
});

app.get('/random-review', async (req, res) => {
    const count = Math.max(1, Math.min(100, parseInt(req.query.count) || 1));

    try {
        const rows = await req.em.getConnection().execute(
            `SELECT game_id, title, market, total_reviews, positive_reviews
             FROM review
             ORDER BY random()
             LIMIT ?`,
            [count]
        );

        if (rows.length === 0) {
            return res.status(400).json({
                error: 'Review pool is empty. Run /prefetch-reviews first.'
            });
        }

        const results = await Promise.all(rows.map(async (r) => {
            let headerImage = null;
            const appId = r.game_id;

            try {
                const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data[appId]?.success) {
                    headerImage = data[appId].data.header_image;
                }
            } catch (e) {
                console.error(`Failed to fetch image for game ${appId}:`, e.message);
            }

            return {
                gameId: r.game_id,
                title: r.title,
                market: r.market,
                totalReviews: r.total_reviews,
                positiveReviews: r.positive_reviews,
                header_image: headerImage // Appending the image here
            };
        }));

        res.json({
            count: results.length,
            results
        });
    } catch (error) {
        console.error('Random review failed:', error);
        res.status(500).json({ error: 'Random review failed', details: error.message });
    }
});

// Remove any already-stored reviews whose games turn out to be adult-rated.
app.get('/prune-adult-reviews', async (req, res) => {
    const em = req.em;
    try {
        const reviews = await em.find(Review, {});
        const removed = [];

        for (const r of reviews) {
            const flaggedByName = hasAdultName(r.title);
            const flaggedBySteam = flaggedByName ? true : await isAdultGame(r.gameId);

            if (flaggedBySteam) {
                removed.push({ gameId: r.gameId, title: r.title });
                em.remove(r);
            }
        }

        await em.flush();

        res.json({
            status: 'success',
            checked: reviews.length,
            removed: removed.length,
            details: removed,
        });
    } catch (error) {
        console.error('Prune adult reviews failed:', error);
        res.status(500).json({ error: 'Prune failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Watching at http://localhost:${PORT}`);
});
