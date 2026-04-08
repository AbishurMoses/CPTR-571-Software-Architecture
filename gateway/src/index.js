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
    message: "Gateway is workinggggg",
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
      maxAge: 1000*60*10 // 10 minute JWT lifespan
    });
    res.cookie("refresh_token", data.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000*60*60*24 // 1 day refresh token lifespan
    });

    return res.json({ loggedIn: true });
  } catch (error) {
    res.status(200).json({ loggedIn: false, message: 'Something went wrong. Please try again later.' });
  }
});

app.post('/wakeup', validateOrRefresh, async (req, res) => {
  return res.json({ loggedIn: true });
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
      case 200:
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

app.get('/health-all', async (req, res) => {
  try {
    const steamFetch = fetch('http://m1:3000/health')
      .then(r => r.ok ? 'OK' : 'NO')
      .catch(() => 'NO');

    const epicFetch = Promise.resolve('NO');

    const [steamStatus, epicStatus] = await Promise.all([steamFetch, epicFetch]);

    res.json({
      Steam: steamStatus,
      Epic: epicStatus
    });

  } catch (error) {
    res.status(500).json({ error: "Could not aggregate health reports" });
  }
});

app.get('/fetch-all-games', async (req, res) => {
  const page = req.query.page || 1;
  const targetUrl = `http://m1:3000/steam-all-games?page=${page}`;

  console.log(`Gateway is attempting to fetch: ${targetUrl}`);

  try {
    const steamResponse = await fetch(targetUrl);
    if (!steamResponse.ok) {
      throw new Error(`Steam service responded with ${steamResponse.status}`);
    }
    const steamData = await steamResponse.json();

    const epicData = {
      page: page,
      total_pages: 0,
      total_games: 0,
      data: []
    };

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

  } catch (error) {
    console.error("Gateway error:", error.message);
    res.status(500).json({
      error: "Failed to aggregate games",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on PORT ${PORT}`)
})

// Validates that a token was created using the private key.
function validateToken(token) {
  try {
    const payload = jwt.verify(token, JWT_PUBLIC_KEY, {
      algorithms: ["RS256"]
    });

    return true;
  } catch (error) {
    return false;
  }
}

async function validateOrRefresh(req, res, next) {
  const refreshToken = req.cookies.refresh_token;
  const accessToken = req.cookies.access_token;
  console.log("Starting token validation middleware")

  if (!refreshToken || !accessToken) {
    console.log("Tokens not found")
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
      maxAge: 1000*60*10
    });
    console.log("New access token created.");

    const newPayload = jwt.verify(data.accessToken, JWT_PUBLIC_KEY, {
      algorithms: ["RS256"]
    });

    req.user = newPayload;
    return next();
  } catch (error) {
    return res.json({ loggedIn: false });
  }
}