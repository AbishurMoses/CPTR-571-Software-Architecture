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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      // If status is 200-299
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

app.post('/create-user', async (req, res) => {
  const { username, password } = req.body;

  try {
    const response = await fetch('http://localhost:4000/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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

app.get('/health-all', async (req, res) => {
  try {
    const steamFetch = fetch('http://localhost:3000/health')
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
  const targetUrl = `http://127.0.0.1:3000/steam-all-games?page=${page}`;

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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})