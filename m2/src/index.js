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

// ── Database setup ────────────────────────────────────────────────────────────
const orm = await MikroORM.init({
    entities: [Game, Metadata, Review],
    dbName: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    debug: true,
});

await orm.schema.ensureDatabase();
// NOTE: schema creation is owned by the seeder scripts in m2/scripts.
// We intentionally skip schema.update() here because it downcasts our
// NUMERIC rating columns back to INTEGER, which breaks fractional IGDB scores.

app.use((req, res, next) => {
    req.em = orm.em.fork();
    next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check — gateway calls this for /health-all
app.get('/health', (req, res) => {
    res.json({
        message: 'Epic Games service is working',
        port: PORT,
    });
});

// Return a paginated list of Epic games from the DB
// Usage: GET /epic-all-games?page=1
app.get('/epic-all-games', async (req, res) => {
    const PAGE_SIZE = 1000;
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
            data: games.map(g => ({
                id: g.id,
                name: g.name,
                productSlug: g.productSlug,
                description: g.description,
                header_image: g.headerImage,
                developer: g.developer,
                publisher: g.publisher,
                releaseDate: g.lastModified
                    ? new Date(g.lastModified * 1000).toISOString()
                    : null,
                price: {
                    originalPrice: g.originalPrice,
                    discountPrice: g.discountPrice,
                    currencyCode: g.currencyCode,
                    priceFormatted: g.priceFormatted,
                    discountPriceFormatted: g.discountPriceFormatted,
                },
            })),
        });
    } catch (error) {
        console.error('Failed to fetch Epic games from DB:', error);
        res.status(500).json({ error: 'Failed to fetch games', details: error.message });
    }
});

// Get full details for a single Epic game from the DB
// Usage: GET /game/:id
app.get('/game/:id', async (req, res) => {
    const gameId = req.params.id;

    try {
        const game = await req.em.findOne(Game, { id: gameId });

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json({
            id: game.id,
            name: game.name,
            productSlug: game.productSlug,
            description: game.description,
            header_image: game.headerImage,
            developer: game.developer,
            publisher: game.publisher,
            releaseDate: game.lastModified
                ? new Date(game.lastModified * 1000).toISOString()
                : null,
            price: {
                originalPrice: game.originalPrice,
                discountPrice: game.discountPrice,
                currencyCode: game.currencyCode,
                priceFormatted: game.priceFormatted,
                discountPriceFormatted: game.discountPriceFormatted,
            },
        });
    } catch (error) {
        console.error(`Failed to fetch game ${gameId}:`, error);
        res.status(500).json({ error: 'Failed to fetch game details', details: error.message });
    }
});

// Get review data for a single Epic game
// Usage: GET /game/:id/reviews
app.get('/game/:id/reviews', async (req, res) => {
    const gameId = req.params.id;

    try {
        const review = await req.em.findOne(Review, { gameId });

        if (!review) {
            return res.status(404).json({ error: 'No review data found for this game' });
        }

        res.json({
            gameId: review.gameId,
            igdbRating: review.igdbRating,
            igdbRatingCount: review.igdbRatingCount,
            igdbAggregatedRating: review.igdbAggregatedRating,
            igdbAggregatedRatingCount: review.igdbAggregatedRatingCount,
        });
    } catch (error) {
        console.error(`Failed to fetch reviews for game ${gameId}:`, error);
        res.status(500).json({ error: 'Failed to fetch reviews', details: error.message });
    }
});


// Prefetch reviews — picks random Epic games that have OpenCritic scores
// and stores them in a pool for the game to use.
// Mirrors M1's /prefetch-reviews endpoint format.
// Usage: GET /prefetch-reviews
app.get('/prefetch-reviews', async (req, res) => {
    const TARGET = 100;
    // Keep this low while the DB is partially seeded — IGDB review counts
    // are tiny for brand-new Epic releases. Raise for production.
    const MIN_REVIEWS = 1;
    const MAX_ATTEMPTS = 50;
    const em = req.em;

    try {
        const totalGames = await em.count(Game);
        if (totalGames === 0) {
            return res.status(400).json({
                error: 'No games in database. Run the seeder first.'
            });
        }

        // Make sure prefetch_review table exists
        await em.getConnection().execute(`
            CREATE TABLE IF NOT EXISTS prefetch_review (
                game_id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(1024),
                market VARCHAR(32) DEFAULT 'epic',
                total_reviews INT,
                positive_reviews INT
            )
        `);

        const pickedThisRequest = new Set();
        const results = [];

        for (let i = 0; i < TARGET; i++) {
            let stored = null;

            for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                const offset = Math.floor(Math.random() * totalGames);
                const [candidate] = await em.find(Game, {}, { limit: 1, offset });
                if (!candidate) continue;
                if (pickedThisRequest.has(candidate.id)) continue;

                // Find its review data
                const reviewData = await em.findOne(Review, { gameId: candidate.id });
                if (!reviewData) continue;

                // Use IGDB rating as the score — need at least one rating source.
                // Decimal columns come back as strings from Postgres, so normalize.
                const userRating = reviewData.igdbRating != null ? Number(reviewData.igdbRating) : null;
                const aggRating = reviewData.igdbAggregatedRating != null ? Number(reviewData.igdbAggregatedRating) : null;
                const userCount = reviewData.igdbRatingCount != null ? Number(reviewData.igdbRatingCount) : 0;
                const aggCount = reviewData.igdbAggregatedRatingCount != null ? Number(reviewData.igdbAggregatedRatingCount) : 0;

                const hasRating = userRating != null || aggRating != null;
                if (!hasRating) continue;

                // Combine user and critic counts so the pool has more variability.
                const totalReviews = userCount + aggCount;
                if (totalReviews < MIN_REVIEWS) continue;

                // Prefer the user score, fall back to critic, then derive positive count.
                const score = userRating ?? aggRating ?? 0;
                const positiveReviews = Math.round((score / 100) * totalReviews);

                // Check if already in prefetch pool
                const exists = await em.getConnection().execute(
                    `SELECT 1 FROM prefetch_review WHERE game_id = '${candidate.id}' LIMIT 1`
                );
                if (exists.length > 0) continue;

                pickedThisRequest.add(candidate.id);

                await em.getConnection().execute(
                    `INSERT INTO prefetch_review (game_id, title, market, total_reviews, positive_reviews)
                     VALUES ('${candidate.id.replace(/'/g, "''")}', '${candidate.name.replace(/'/g, "''")}', 'epic', ${totalReviews}, ${positiveReviews})
                     ON CONFLICT (game_id) DO NOTHING`
                );

                stored = {
                    gameId: candidate.id,
                    title: candidate.name,
                    market: 'epic',
                    totalReviews,
                    positiveReviews,
                };
                break;
            }

            if (stored) {
                results.push(stored);
            } else {
                results.push({
                    error: `Could not find a qualifying game after ${MAX_ATTEMPTS} attempts`
                });
            }
        }

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

// Return random Epic games from the prefetch pool with header images
// Mirrors M1's /random-review endpoint format.
// Usage: GET /random-review?count=2
app.get('/random-review', async (req, res) => {
    const count = Math.max(1, Math.min(100, parseInt(req.query.count) || 1));

    try {
        // Make sure prefetch_review table exists
        await req.em.getConnection().execute(`
            CREATE TABLE IF NOT EXISTS prefetch_review (
                game_id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(1024),
                market VARCHAR(32) DEFAULT 'epic',
                total_reviews INT,
                positive_reviews INT
            )
        `);

        const rows = await req.em.getConnection().execute(
            `SELECT game_id, title, market, total_reviews, positive_reviews
             FROM prefetch_review
             ORDER BY random()
             LIMIT ${count}`
        );

        if (rows.length === 0) {
            return res.status(400).json({
                error: 'Review pool is empty. Run /prefetch-reviews first.'
            });
        }

        const results = await Promise.all(rows.map(async (r) => {
            const game = await req.em.findOne(Game, { id: r.game_id });
            return {
                gameId: r.game_id,
                title: r.title,
                market: r.market,
                totalReviews: r.total_reviews,
                positiveReviews: r.positive_reviews,
                header_image: game?.headerImage ?? null,
                productSlug: game?.productSlug ?? null,
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

app.listen(PORT, () => {
    console.log(`Epic Games service watching at http://localhost:${PORT}`);
});