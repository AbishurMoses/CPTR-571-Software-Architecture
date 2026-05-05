import type { GameData, Platform } from "../types/game";
import { fetchRandomGames } from "./apiService";
import { mockGames } from "../data/mockGames";

/**
 * Loads games from the gateway for the selected platform.
 * Falls back to mock data if the API call fails.
 */
export async function loadGames(platform: Platform): Promise<GameData[]> {
  try {
    const games = await fetchRandomGames(platform, 20);
    if (games.length < 2) {
      throw new Error("Not enough games returned from API");
    }
    return games;
  } catch (error) {
    console.warn("Failed to load games from API, using mock data:", error);
    // TODO: Remove this fallback once both platforms are stable
    return mockGames;
  }
}

export function getRandomGame(
  pool: GameData[],
  exclude: GameData[]
): GameData {
  const available = pool.filter((game) => !exclude.includes(game));

  if (available.length === 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

export function getRandomPair(pool: GameData[]): [GameData, GameData] {
  if (pool.length < 2) {
    throw new Error("Not enough games to form a pair. Need at least 2 games.");
  }

  const first = pool[Math.floor(Math.random() * pool.length)];
  const second = getRandomGame(pool, [first]);

  return [first, second];
}
