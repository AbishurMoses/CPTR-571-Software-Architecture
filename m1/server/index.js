import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.dev') });

const app = express();
const PORT = process.env.API_PORT;

app.get('/health', (req, res) => {
    res.json({
        message: "Backend is working",
        port: PORT
    });
});

// index.js (Simplified Seeding Route)
// Get /seed-steam
app.get('/seed-steam', async (req, res) => {
    const url = `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${process.env.STEAM_API_KEY}&include_games=true&max_results=10`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const games = data.response.apps; // Array of {appid, name, last_modified}

        try {
            const response = await fetch(url);
            const data = await response.json();

            const games = data.response?.apps || [];

            res.json({
                message: "Success",
                count: games.length,
                games: games
            });
        } catch (err) {
            res.status(500).send("Unable to parse data")
        }
    } catch (e) {
        res.status(500).send("Seeding failed");
    }
});

// GET /seed-updates
app.get('/seed-updates', async (req, res) => {
    // In production, you'd pull this from your DB. 
    // For testing, pass it as a query param or use a hardcoded past date.
    const oneWeek = 3 * 24 * 60 * 60
    const sinceTimestamp = Math.floor(Date.now() / 1000) - oneWeek

    const url = `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${process.env.STEAM_API_KEY}&include_games=true&if_modified_since=${sinceTimestamp}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const games = data.response?.apps || [];

        res.json({
            status: "success",
            message: `Found ${games.length} updates since timestamp ${sinceTimestamp}`,
            last_appid: data.response?.last_appid, // Use this for pagination if there are >10k results
            games
        });
    } catch (e) {
        res.status(500).json({ error: "Update fetch failed" });
    }
});

// GET /game/{id}
app.get('/game/:id', async (req, res) => {
    const appId = req.params.id;
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Steam's format: { "APPID": { "success": true, "data": { ... } } }
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
    console.log(`🚀 Server watching at http://localhost:${PORT}`);
});