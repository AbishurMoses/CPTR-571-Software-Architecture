import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env.dev') });

const app = express()
const PORT = process.env.API_PORT;
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:1000',
  credentials: true
}));

app.get('/health', (req, res) => {
  res.json({
    message: "Gateway is working",
    port: PORT
  });
})

app.post('/login-auth', async (req, res) => {
  const { username, password } = req.body;

  try {
    const response = await fetch('http://auth:4000/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.json({ loggedIn: false, message: 'Invalid username or password.' });
    }

    // TODO: Compute maxAge from tokens rather than rely hard code it?
    res.cookie("access_token", data.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 10 // 10 minute JWT lifespan
    });
    res.cookie("refresh_token", data.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 // 1 day refresh token lifespan
    });

    return res.json({ loggedIn: true, user: { id: jwt.verify(data.accessToken, JWT_PUBLIC_KEY, { algorithms: ["RS256"] }).sub, username } });
  } catch (error) {
    res.status(200).json({ loggedIn: false, message: 'Something went wrong. Please try again later.' });
  }
});

app.post('/wakeup', validateOrRefresh, async (req, res) => {
  return res.json({ loggedIn: true, user: { id: req.user.sub, username: req.user.username } });
});

app.post('/create-user', async (req, res) => {
  const username = req.body?.username ?? undefined;
  const password = req.body?.password ?? undefined;

  if (!username || !password) {
    res.json({
      message: 'You must enter a username and password.'
    });
    return
  }

  try {
    const response = await fetch('http://auth:4000/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    switch (response.status) {
      case 201:
        res.json({
          message: 'Your account has been created. Please log in below.'
        });
        break;
      case 400:
        res.json({
          message: data.message[0].charAt(0).toUpperCase() + data.message[0].slice(1)
        });
        break;
      case 409:
        res.json({
          message: 'Username already exists.'
        });
        break;
      case 500:
        res.json({
          message: 'Something went wrong. Please try again later.'
        });
        break;
      default:
        res.json({
          status: response.status,
          message: 'An issue occurred.'
        });
        break;
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/leaderboard', async (req, res) => {
  try {
    const response = await fetch('http://auth:4000/users/leaderboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(500).json({ message: 'Something went wrong.' });
    }

    const data = await response.json();

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.patch('/highscore', validateOrRefresh, async (req, res) => {
  const userId = req.user.sub;
  const score = Number(req.body.score);

  if (!Number.isInteger(score) || score < 0) {
    return res.status(400).json({ message: 'Score must be a non-negative integer.' });
  }

  try {
    const response = await fetch(`http://auth:4000/users/${userId}/highscore`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch random games with review data for the Higher/Lower game
// ?count=10&platform=steam|epic
app.get('/random-games', async (req, res) => {
  const count = Math.min(100, Math.max(1, parseInt(req.query.count) || 10));
  const platform = req.query.platform || 'steam';

  try {
    if (platform === 'steam') {
      const response = await fetch(`http://m1:3000/random-review?count=${count}`);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Steam service failed to return games' });
      }
      const data = await response.json();
      return res.json(data);
    }

    if (platform === 'epic') {
      const response = await fetch(`http://m2:5000/random-review?count=${count}`);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Epic service failed to return games' });
      }
      const data = await response.json();
      return res.json(data);
    }

    return res.status(400).json({ error: `Unknown platform: ${platform}` });
  } catch (error) {
    console.error('Gateway /random-games error:', error.message);
    res.status(500).json({ error: 'Failed to fetch random games', details: error.message });
  }
});

app.get('/health-all', async (req, res) => {
  try {
    const steamFetch = fetch('http://m1:3000/health')
      .then(r => r.ok ? 'OK' : 'NO')
      .catch(() => 'NO');

    const epicFetch = fetch('http://m2:5000/health')
      .then(r => r.ok ? 'OK' : 'NO')
      .catch(() => 'NO');

    const [steamStatus, epicStatus] = await Promise.all([steamFetch, epicFetch]);

    res.json({
      Steam: steamStatus,
      Epic: epicStatus
    });

  } catch (error) {
    res.status(500).json({ error: "Could not aggregate health reports" });
  }
});

app.get('/steam-game/:id', async (req, res) => {
  const id = req.params.id; 
  
  try {
    const steamResponse = await fetch(`http://m1:3000/game/${id}`);
    const gameData = await steamResponse.json();

    if (steamResponse.ok) {
      res.json(gameData);
    } else {
      res.status(steamResponse.status).json({ 
        error: "Steam service could not find the game",
        details: gameData.error 
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gateway failed to connect to Steam service", details: err.message });
  }
});

app.get('/epic-game/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const epicResponse = await fetch(`http://m2:5000/game/${id}`);
    const gameData = await epicResponse.json();

    if (epicResponse.ok) {
      res.json(gameData);
    } else {
      res.status(epicResponse.status).json({
        error: "Epic service could not find the game",
        details: gameData.error
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gateway failed to connect to Epic service", details: err.message });
  }
});

app.get('/fetch-all-games', async (req, res) => {
  const page = req.query.page || 1;
  const steamUrl = `http://m1:3000/steam-all-games?page=${page}`;
  const epicUrl = `http://m2:5000/epic-all-games?page=${page}`;

  console.log(`Gateway is attempting to fetch: ${steamUrl} and ${epicUrl}`);

  // Run both upstream calls in parallel so a slow/failing one doesn't block the other.
  const emptyEpic = { page, total_pages: 0, total_games: 0, data: [] };
  const emptySteam = { page, total_pages: 0, total_games: 0, data: [] };

  const [steamData, epicData] = await Promise.all([
    fetch(steamUrl)
      .then(r => r.ok ? r.json() : emptySteam)
      .catch((err) => {
        console.error('Steam fetch failed:', err.message);
        return emptySteam;
      }),
    fetch(epicUrl)
      .then(r => r.ok ? r.json() : emptyEpic)
      .catch((err) => {
        console.error('Epic fetch failed:', err.message);
        return emptyEpic;
      }),
  ]);

  res.json([
    {
      source: "Steam Service",
      currentPage: steamData.page,
      totalPages: steamData.total_pages,
      totalGames: steamData.total_games,
      games: steamData.data
    },
    {
      source: "Epic Service",
      currentPage: epicData.page,
      totalPages: epicData.total_pages,
      totalGames: epicData.total_games,
      games: epicData.data
    }
  ]);
});

app.listen(PORT, () => {
  console.log(`Example app listening on PORT ${PORT}`)
})

async function validateOrRefresh(req, res, next) {
  const refreshToken = req.cookies.refresh_token;
  const accessToken = req.cookies.access_token;

  if (!refreshToken || !accessToken) {
    return res.json({ loggenIn: false });
  }

  // See if access token is valid and extract the user information.
  try {
    const payload = jwt.verify(accessToken, JWT_PUBLIC_KEY, {
      algorithms: ["RS256"]
    });

    req.user = payload;
    return next();
  } catch (error) {
    if (error.name !== "TokenExpiredError") {
      return res.json({ loggedIn: false });
    }
  }

  // If access token is invalid, check the refresh token to refresh it.
  try {
    const response = await fetch("http://auth:4000/authenticate/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) {
      return res.json({ loggedIn: false });
    }
    const data = await response.json();

    res.cookie("access_token", data.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 10
    });

    const newPayload = jwt.verify(data.accessToken, JWT_PUBLIC_KEY, {
      algorithms: ["RS256"]
    });

    req.user = newPayload;
    return next();
  } catch (error) {
    return res.json({ loggedIn: false });
  }
}