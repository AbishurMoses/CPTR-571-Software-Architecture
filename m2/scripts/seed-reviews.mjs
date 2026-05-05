// seed-reviews.mjs
// Seeds game ratings from IGDB (via Twitch API) for all games in the DB.
// Matches games by name, saves aggregated_rating (critic) and rating (user).
// Processes games in batches — no browser needed, fast and reliable.
//
// Prerequisites:
//   npm install pg
//
// Setup:
//   Get free credentials at https://dev.twitch.tv/console
//   Fill in TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET below
//
// Usage:
//   node seed-reviews.mjs  (or let run-seed-reviews.bat handle it)

import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// ── Twitch/IGDB credentials ───────────────────────────────────────────────────
const TWITCH_CLIENT_ID = 'd3xo5e466ripqk0gfnt751haprwbnt';
const TWITCH_CLIENT_SECRET = 'zoqdx1yd0h4qw89vgh6vcewsa0or7i';
// ─────────────────────────────────────────────────────────────────────────────

const PROGRESS_FILE = './review-progress.json';
const BATCH_SIZE = 100; // games per run

const db = new Client({
    host: 'localhost',
    port: 5431,
    user: 'user_dev',
    password: 'devpassword',
    database: 'db',
});

let igdbToken = null;
let igdbTokenExpiry = 0;

async function getIGDBToken() {
    if (igdbToken && Date.now() < igdbTokenExpiry) return igdbToken;

    const res = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
        { method: 'POST' }
    );

    if (!res.ok) throw new Error(`Failed to get IGDB token: ${res.status} — check your credentials`);

    const data = await res.json();
    igdbToken = data.access_token;
    igdbTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return igdbToken;
}

// Search IGDB for a game by name and return its ratings
async function getIGDBRatings(name) {
    const token = await getIGDBToken();

    // Remove characters that break IGDB's query syntax
    const safeName = name.replace(/['"\\]/g, ' ').trim();

    const res = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain',
        },
        body: `fields name, rating, rating_count, aggregated_rating, aggregated_rating_count;
               search "${safeName}";
               limit 1;`,
    });

    if (!res.ok) throw new Error(`IGDB API error: ${res.status}`);

    const data = await res.json();
    const game = data[0];

    if (!game) return null;

    return {
        igdbRating: game.rating ?? null,                               // user rating 0-100
        igdbRatingCount: game.rating_count ?? null,
        igdbAggregatedRating: game.aggregated_rating ?? null,          // critic rating 0-100
        igdbAggregatedRatingCount: game.aggregated_rating_count ?? null,
    };
}

function loadProgress() {
    try {
        return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch {
        return { lastProcessedIndex: -1, totalReviewed: 0 };
    }
}

function saveProgress(progress) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function main() {
    await db.connect();
    console.log('Connected to M2 Postgres DB');

    await db.query(`
        CREATE TABLE IF NOT EXISTS review (
            id SERIAL PRIMARY KEY,
            game_id VARCHAR(255) UNIQUE NOT NULL,
            igdb_rating NUMERIC,
            igdb_rating_count NUMERIC,
            igdb_aggregated_rating NUMERIC,
            igdb_aggregated_rating_count NUMERIC
        );
    `);

    await db.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'review_game_id_unique'
            ) THEN
                ALTER TABLE review ADD CONSTRAINT review_game_id_unique UNIQUE (game_id);
            END IF;
        END
        $$;
    `);

    const { rows: games } = await db.query(`SELECT id, name FROM game ORDER BY id`);
    const total = games.length;

    if (total === 0) {
        console.log('No games found in DB — run seed-epic-browser.mjs first.');
        await db.end();
        process.exit(0);
    }

    const progress = loadProgress();
    let { lastProcessedIndex, totalReviewed } = progress;
    const startIndex = lastProcessedIndex + 1;

    if (startIndex >= total) {
        console.log(`✓ Already complete! Reviews seeded for all ${totalReviewed} games.`);
        await db.end();
        process.exit(0);
    }

    console.log(`Resuming from game ${startIndex + 1} / ${total} (${totalReviewed} reviewed so far)`);

    const endIndex = Math.min(startIndex + BATCH_SIZE, total);

    for (let i = startIndex; i < endIndex; i++) {
        const game = games[i];
        process.stdout.write(`[${i + 1}/${total}] ${game.name}... `);

        try {
            const ratings = await getIGDBRatings(game.name);

            await db.query(
                `INSERT INTO review (game_id, igdb_rating, igdb_rating_count, igdb_aggregated_rating, igdb_aggregated_rating_count)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (game_id) DO UPDATE SET
                    igdb_rating = EXCLUDED.igdb_rating,
                    igdb_rating_count = EXCLUDED.igdb_rating_count,
                    igdb_aggregated_rating = EXCLUDED.igdb_aggregated_rating,
                    igdb_aggregated_rating_count = EXCLUDED.igdb_aggregated_rating_count`,
                [
                    game.id,
                    ratings?.igdbRating ?? null,
                    ratings?.igdbRatingCount ?? null,
                    ratings?.igdbAggregatedRating ?? null,
                    ratings?.igdbAggregatedRatingCount ?? null,
                ]
            );

            totalReviewed++;
            saveProgress({ lastProcessedIndex: i, totalReviewed });
            console.log(ratings ? `✓ rating=${ratings.igdbRating?.toFixed(1) ?? 'null'} critic=${ratings.igdbAggregatedRating?.toFixed(1) ?? 'null'}` : `✓ no IGDB match`);

        } catch (err) {
            console.log(`${err.message} — skipping`);
            // Advance past this game so we don't retry forever
            saveProgress({ lastProcessedIndex: i, totalReviewed });
            await new Promise(r => setTimeout(r, 250));
        }

        // Small delay to respect IGDB rate limits (4 requests/sec max)
        await new Promise(r => setTimeout(r, 100));
    }

    if (startIndex + BATCH_SIZE >= total) {
        console.log(`\n✓ Review seeding complete! ${totalReviewed} games reviewed.`);
        try { fs.unlinkSync(PROGRESS_FILE); } catch {}
    } else {
        console.log(`\nBatch done. Run again to continue (${totalReviewed} / ${total} reviewed).`);
    }

    await db.end();
    process.exit(0);
}

main().catch(async (err) => {
    console.error('Failed:', err.message);
    process.exit(1);
});
