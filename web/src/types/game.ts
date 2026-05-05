export interface GameData {
  name: string; // Display name of the game
  image: string; // URL to the game's cover image
  reviews: number; // Numeric review count used for comparison (totalReviews from API)
  description?: string; // Optional description shown on the exit page
  gameId?: string | number; // Steam appId (number) or Epic offer id (string)
  market?: string; // "steam" | "epic" — determines which store URL to build
  productSlug?: string; // Epic only — used to build the store URL
}

// Raw shape returned by the gateway /random-games endpoint.
// Steam returns numeric gameIds, Epic returns string offer ids — accept either.
export interface RawGameResult {
  gameId: string | number;
  title: string;
  market: string;
  totalReviews: number;
  positiveReviews: number;
  header_image: string | null;
  productSlug?: string | null;
}

export interface RandomGamesResponse {
  count: number;
  results: RawGameResult[];
}

export type Platform = "steam" | "epic";
