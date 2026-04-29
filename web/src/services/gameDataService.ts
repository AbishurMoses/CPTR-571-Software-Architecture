import type { GameData } from "../types/game";
import { mockGames } from "../data/mockGames";

export function getAllGames(): GameData[] {
  // Currently returns mock data
  // Will be replaced with API call when Gateway is ready
  return mockGames;
}

export function getRandomGame(exclude: GameData[]): GameData {
  const available = getAllGames().filter((game) => !exclude.includes(game));

  if (available.length === 0) {
    // Fallback: return any random game if all are excluded
    const allGames = getAllGames();
    return allGames[Math.floor(Math.random() * allGames.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

export function getRandomPair(): [GameData, GameData] {
  const allGames = getAllGames();

  if (allGames.length < 2) {
    throw new Error("Not enough games to form a pair. Need at least 2 games.");
  }

  const first = allGames[Math.floor(Math.random() * allGames.length)];
  const second = getRandomGame([first]);

  return [first, second];
}
