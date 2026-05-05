import { useState } from "react";
import GameBoard from "../components/GameBoard";
import PlatformPicker from "../components/PlatformPicker";
import { loadGames } from "../services/gameDataService";
import type { GameData, Platform } from "../types/game";

interface HomePageProps {
  onGameOver: (losingGame: GameData, finalScore: number) => void;
}

export default function HomePage({ onGameOver }: HomePageProps) {
  const [games, setGames] = useState<GameData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlatformSelect = async (platform: Platform) => {
    setLoading(true);
    setError(null);

    try {
      const loaded = await loadGames(platform);
      setGames(loaded);
    } catch (err) {
      setError("Failed to load games. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Show platform picker until games are loaded
  if (!games) {
    return (
      <>
        <PlatformPicker onSelect={handlePlatformSelect} loading={loading} />
        {error && (
          <p style={{ color: "red", textAlign: "center", marginTop: "1rem" }}>
            {error}
          </p>
        )}
      </>
    );
  }

  return <GameBoard games={games} onGameOver={onGameOver} />;
}
