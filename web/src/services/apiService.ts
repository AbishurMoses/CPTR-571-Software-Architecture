import type { GameData } from "../types/game";

const GATEWAY_URL = "http://localhost:2000";

export async function fetchAllGames(): Promise<GameData[]> {
  const response = await fetch(`${GATEWAY_URL}/fetch-all-games`, {
    credentials: "include",
  });
  return response.json();
}
