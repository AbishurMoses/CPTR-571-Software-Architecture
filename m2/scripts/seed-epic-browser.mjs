// seed-epic-browser.mjs
// Resumable Epic Games seeder — saves full game details including price,
// description, header image, developer, and publisher.
//
// Prerequisites:
//   npm install puppeteer pg
//
// Usage:
//   node seed-epic-browser.mjs  (or let run-seed.bat handle it)

import puppeteer from 'puppeteer';
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const PROGRESS_FILE = './seed-progress.json';
const PAGE_SIZE = 40;

const db = new Client({
    host: 'localhost',
    port: 5431,
    user: 'user_dev',
    password: 'devpassword',
    database: 'db',
});

function buildBrowseUrl(start = 0, count = 40) {
    return `https://store.epicgames.com/en-US/browse?sortBy=releaseDate&sortDir=DESC&category=Game&count=${count}&start=${start}`;
}

function loadProgress() {
    try {
        return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch {
        return { start: 0, totalFetched: 0, totalAvailable: null };
    }
}

function saveProgress(progress) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function main() {
    await db.connect();
    console.log('Connected to M2 Postgres DB');

    // Full schema with all useful fields from Epic's GraphQL response
    await db.query(`
        CREATE TABLE IF NOT EXISTS game (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(1024) NOT NULL,
            namespace VARCHAR(255),
            product_slug VARCHAR(512),
            last_modified INT,
            description TEXT,
            header_image TEXT,
            developer VARCHAR(512),
            publisher VARCHAR(512),
            original_price INT,
            discount_price INT,
            currency_code VARCHAR(16),
            price_formatted VARCHAR(64),
            discount_price_formatted VARCHAR(64)
        );
    `);

    // Add new columns if upgrading from old schema (safe to run multiple times)
    const newColumns = [
        `ALTER TABLE game ADD COLUMN IF NOT EXISTS namespace VARCHAR(255)`,
        `ALTER TABLE game ADD COLUMN IF NOT EXISTS product_slug VARCHAR(512)`,
        `ALTER TABLE game ADD COLUMN IF NOT EXISTS description TEXT`,
        `ALTER TABLE game ADD COLUMN IF NOT EXISTS header_image TEXT`,
        `ALTER TABLE game ADD COLUMN IF NOT EXISTS developer VARCHAR(512)`,
        `ALTER TABLE game ADD COLUMN IF NOT EXISTS publisher VARCHAR(512)`,
        `ALTER TABLE game ADD COLUMN IF NOT EXISTS original_price INT`,
        `ALTER TABLE game ADD COLUMN IF NOT EXISTS discount_price INT`,
        `ALTER TABLE game ADD COLUMN IF NOT EXISTS currency_code VARCHAR(16)`,
        `ALTER TABLE game ADD COLUMN IF NOT EXISTS price_formatted VARCHAR(64)`,
        `ALTER TABLE game ADD COLUMN IF NOT EXISTS discount_price_formatted VARCHAR(64)`,
    ];
    for (const col of newColumns) {
        await db.query(col);
    }

    await db.query(`
        CREATE TABLE IF NOT EXISTS metadata (
            id INT PRIMARY KEY,
            last_sync_timestamp INT NOT NULL
        );
    `);

    const progress = loadProgress();
    let { start, totalFetched, totalAvailable } = progress;

    if (start > 0) {
        console.log(`Resuming from offset ${start} (${totalFetched} games already seeded)`);
    }

    if (totalAvailable !== null && totalFetched >= totalAvailable) {
        console.log(`✓ Already complete! ${totalFetched} / ${totalAvailable} games seeded.`);
        await db.end();
        process.exit(0);
    }

    console.log('Launching browser (visible window)...');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    let capturedResponse = null;
    let responseResolver = null;

    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/graphql') && url.includes('operationName=searchStoreQuery')) {
            try {
                const json = await response.json();
                capturedResponse = json;
                if (responseResolver) {
                    responseResolver();
                    responseResolver = null;
                }
            } catch {
                // ignore
            }
        }
    });

    function waitForCapture(timeoutMs = 30000) {
        if (capturedResponse) return Promise.resolve();
        return new Promise((resolve, reject) => {
            responseResolver = resolve;
            setTimeout(() => {
                responseResolver = null;
                reject(new Error('Timed out'));
            }, timeoutMs);
        });
    }

    console.log(`Visiting Epic Games Store at offset ${start} (complete security check if prompted)...`);
    capturedResponse = null;
    const firstCapture = waitForCapture(30000);

    await page.goto(buildBrowseUrl(start, PAGE_SIZE), {
        waitUntil: 'networkidle2',
        timeout: 30000,
    });

    await firstCapture;

    if (totalAvailable === null) {
        totalAvailable = capturedResponse?.data?.Catalog?.searchStore?.paging?.total || 0;
        console.log(`Total Epic games available: ${totalAvailable}`);
    }

    console.log('Got page! Saving games...');

    const storeData = capturedResponse?.data?.Catalog?.searchStore;
    const elements = storeData?.elements || [];

    if (elements.length === 0) {
        console.log('No games returned — will retry next run.');
        await browser.close();
        await db.end();
        process.exit(1);
    }

    for (const g of elements) {
        const lastModified = g.releaseDate
            ? Math.floor(new Date(g.releaseDate).getTime() / 1000)
            : null;

        // Pull header image — prefer wide store image
        const headerImage =
            g.keyImages?.find(img => img.type === 'DieselStoreFrontWide')?.url ??
            g.keyImages?.find(img => img.type === 'OfferImageWide')?.url ??
            g.keyImages?.[0]?.url ??
            null;

        // Extract productSlug from customAttributes
        const productSlug = g.customAttributes?.find(
            a => a.key === 'com.epicgames.app.productSlug'
        )?.value ?? null;

        // Price fields
        const totalPrice = g.price?.totalPrice;
        const originalPrice = totalPrice?.originalPrice ?? null;       // in cents e.g. 999 = $9.99
        const discountPrice = totalPrice?.discountPrice ?? null;
        const currencyCode = totalPrice?.currencyCode ?? null;
        const priceFormatted = totalPrice?.fmtPrice?.originalPrice ?? null;
        const discountPriceFormatted = totalPrice?.fmtPrice?.discountPrice ?? null;

        await db.query(
            `INSERT INTO game (
                id, name, namespace, product_slug, last_modified, description, header_image,
                developer, publisher,
                original_price, discount_price, currency_code,
                price_formatted, discount_price_formatted
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                namespace = EXCLUDED.namespace,
                product_slug = EXCLUDED.product_slug,
                last_modified = EXCLUDED.last_modified,
                description = EXCLUDED.description,
                header_image = EXCLUDED.header_image,
                developer = EXCLUDED.developer,
                publisher = EXCLUDED.publisher,
                original_price = EXCLUDED.original_price,
                discount_price = EXCLUDED.discount_price,
                currency_code = EXCLUDED.currency_code,
                price_formatted = EXCLUDED.price_formatted,
                discount_price_formatted = EXCLUDED.discount_price_formatted`,
            [
                g.id,
                g.title,
                g.namespace ?? null,
                productSlug,
                lastModified,
                g.description ?? null,
                headerImage,
                g.developerDisplayName ?? null,
                g.publisherDisplayName ?? null,
                originalPrice,
                discountPrice,
                currencyCode,
                priceFormatted,
                discountPriceFormatted,
            ]
        );
    }

    totalFetched += elements.length;
    start += PAGE_SIZE;
    saveProgress({ start, totalFetched, totalAvailable });
    console.log(`✓ Seeded ${totalFetched} / ${totalAvailable} games.`);

    if (totalFetched >= totalAvailable) {
        await db.query(
            `INSERT INTO metadata (id, last_sync_timestamp)
             VALUES (1, $1)
             ON CONFLICT (id) DO UPDATE SET last_sync_timestamp = EXCLUDED.last_sync_timestamp`,
            [Math.floor(Date.now() / 1000)]
        );
        console.log(`\n✓ Seeding complete!`);
        try { fs.unlinkSync(PROGRESS_FILE); } catch {}
    }

    await browser.close();
    await db.end();
    process.exit(0);
}

main().catch(async (err) => {
    console.error('Failed:', err.message);
    process.exit(1);
});
