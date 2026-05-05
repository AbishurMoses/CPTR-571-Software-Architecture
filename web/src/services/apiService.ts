import type { GameData, RandomGamesResponse, Platform } from "../types/game";

const GATEWAY_URL = "http://localhost:2000";

/**
 * Fetches random games with review data from the gateway.
 * @param platform - "steam" or "epic"
 * @param count - number of games to fetch (default 10)
 */
export async function fetchRandomGames(
  platform: Platform,
  count: number = 10
): Promise<GameData[]> {
  const response = await fetch(
    `${GATEWAY_URL}/random-games?platform=${platform}&count=${count}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch games (${response.status})`);
  }

  const data: RandomGamesResponse = await response.json();

  // Transform API response into the GameData shape used by components
  return data.results
    .filter((g) => g.header_image !== null) // skip games with no image
    .map((g) => ({
      name: g.title,
      image: g.header_image as string,
      reviews: g.totalReviews,
      gameId: g.gameId,
      market: g.market,
    }));
}

/**
 * Legacy: fetch all games list (paginated). Kept for reference.
 */
export async function fetchAllGames(): Promise<unknown[]> {
  const response = await fetch(`${GATEWAY_URL}/fetch-all-games`, {
    credentials: "include",
  });
  return response.json();
}
