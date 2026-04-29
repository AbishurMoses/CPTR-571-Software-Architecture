const express = require('express')
const app = express()
const port = 2000

app.use(express.json());

app.get('/health', (req, res) => {
  res.send('Gateway is ready')
})

app.post('/authenticate-user', async (req, res) => {
  const { username, password } = req.body;

  try {
    const response = await fetch('http://localhost:4000/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({
        message: "User authenticated successfully!",
        authServiceResponse: data
      });
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

app.post('/create-user', async (req, res) => {
  const { username, password } = req.body;

  try {
    const response = await fetch('http://localhost:4000/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({
        message: "User created successfully!",
        authServiceResponse: data
      });
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Checks health of all microservices
app.get('/health-all', async (req, res) => {
  try {
    const steamFetch = fetch('http://localhost:3000/health')
      .then(r => r.ok ? 'OK' : 'NO')
      .catch(() => 'NO');

    const epicFetch = fetch('http://localhost:5000/health')
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

// Fetches paginated games from both Steam (M1) and Epic (M2)
app.get('/fetch-all-games', async (req, res) => {
  const page = req.query.page || 1;

  try {
    const steamFetch = fetch(`http://localhost:3000/steam-all-games?page=${page}`)
      .then(r => r.json())
      .catch(() => null);

    const epicFetch = fetch(`http://localhost:5000/epic-all-games?page=${page}`)
      .then(r => r.json())
      .catch(() => null);

    const [steamData, epicData] = await Promise.all([steamFetch, epicFetch]);

    res.json([
      {
        source: "Steam Service",
        currentPage: steamData?.page ?? page,
        totalPages: steamData?.total_pages ?? 0,
        totalGames: steamData?.total_games ?? 0,
        games: steamData?.data ?? []
      },
      {
        source: "Epic Service",
        currentPage: epicData?.page ?? page,
        totalPages: epicData?.total_pages ?? 0,
        totalGames: epicData?.total_games ?? 0,
        games: epicData?.data ?? []
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

app.listen(port, () => {
  console.log(`Gateway listening on port ${port}`)
})
