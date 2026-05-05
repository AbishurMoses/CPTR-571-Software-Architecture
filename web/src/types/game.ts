export interface GameData {
  name: string; // Display name of the game
  image: string; // URL to the game's cover image
  reviews: number; // Numeric review count used for comparison (totalReviews from API)
  description?: string; // Optional description shown on the exit page
  gameId?: number; // Steam appId or Epic store ID — used for linking to store page
  market?: string; // "steam" | "epic" — determines which store URL to build
}

// Raw shape returned by the gateway /random-games endpoint (Steam)
export interface RawGameResult {
  gameId: number;
  title: string;
  market: string;
  totalReviews: number;
  positiveReviews: number;
  header_image: string | null;
}

export interface RandomGamesResponse {
  count: number;
  results: RawGameResult[];
}

export type Platform = "steam" | "epic";
