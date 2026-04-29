# Web — Higher or Lower Game

React + TypeScript + Vite frontend for a "Higher or Lower" guessing game.

## How It Works

Two video game cards are shown side by side. Click the one you think has the higher review score. Correct guesses build a streak; incorrect guesses reset it. The winning card carries forward to the next round.

## Project Structure

```
src/
├── types/game.ts              # GameData interface
├── data/mockGames.ts          # 12 mock game entries
├── services/
│   ├── gameDataService.ts     # Random game selection logic
│   └── apiService.ts          # Gateway API client (future)
├── components/
│   ├── GameBoard.tsx          # Main game container + state
│   ├── GameCard.tsx           # Clickable half-screen card
│   ├── ORDivider.tsx          # "OR" circle between cards
│   └── ScoreOverlay.tsx       # Score + high score display
└── pages/
    ├── HomePage.tsx            # Renders GameBoard
    └── LoginPage.tsx           # Login screen
```

## Running

```bash
yarn dev
```

Opens at `http://localhost:5173`. Requires the Gateway (`localhost:2000`) for login — or set `loggedIn` to `true` in `App.tsx` to bypass.

## Data Layer

Currently uses mock data. When the Gateway is ready, swap `gameDataService.ts` to call `apiService.fetchAllGames()` — no UI changes needed.
