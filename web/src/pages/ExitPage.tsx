import { useState } from "react";
import type { GameData } from "../types/game";
import Leaderboard from "../components/Leaderboard";
import styles from "./ExitPage.module.css";

interface ExitPageProps {
  game: GameData;
  finalScore: number;
  onPlayAgain: () => void;
  onLogout: () => void;
}

export default function ExitPage({ game, finalScore, onPlayAgain, onLogout }: ExitPageProps) {
  // 0 = leaderboard, 1 = game detail
  const [activeSlide, setActiveSlide] = useState(0);

  const goLeft = () => setActiveSlide((prev) => (prev === 0 ? 1 : 0));
  const goRight = () => setActiveSlide((prev) => (prev === 0 ? 1 : 0));

  return (
    <div className={styles.exitPage}>
      <h1 className={styles.title}>Game Over</h1>
      <p className={styles.subtitle}>You scored {finalScore} before guessing wrong.</p>

      <div className={styles.carousel}>
        {/* Left arrow */}
        <button
          className={styles.arrowBtn}
          onClick={goLeft}
          aria-label="Previous card"
        >
          &#8592;
        </button>

        {/* Card area */}
        <div className={styles.cardContainer}>
          {/* Slide 0: Leaderboard */}
          <div
            className={`${styles.slide} ${
              activeSlide === 0
                ? styles.slideActive
                : styles.slideLeft
            }`}
          >
            <Leaderboard />
          </div>

          {/* Slide 1: Game detail */}
          <div
            className={`${styles.slide} ${
              activeSlide === 1
                ? styles.slideActive
                : styles.slideRight
            }`}
          >
            <div className={styles.gameCard}>
              <img
                className={styles.gameImage}
                src={game.image}
                alt={game.name}
              />
              <span className={styles.gameName}>{game.name}</span>
              <span className={styles.gameReviews}>
                Reviews: {game.reviews}
              </span>
              {game.description && (
                <p className={styles.gameDescription}>{game.description}</p>
              )}
              {/* Link to the store page if we have a gameId */}
              {game.gameId && (
                <a
                  className={styles.storeLink}
                  href={
                    game.market === "epic"
                      ? `https://store.epicgames.com/p/${game.productSlug ?? game.gameId}`
                      : `https://store.steampowered.com/app/${game.gameId}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on {game.market === "epic" ? "Epic Games" : "Steam"} →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right arrow */}
        <button
          className={styles.arrowBtn}
          onClick={goRight}
          aria-label="Next card"
        >
          &#8594;
        </button>
      </div>

      {/* Dot indicators */}
      <div className={styles.dots}>
        <span className={`${styles.dot} ${activeSlide === 0 ? styles.dotActive : ""}`} />
        <span className={`${styles.dot} ${activeSlide === 1 ? styles.dotActive : ""}`} />
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button className={styles.playAgainBtn} onClick={onPlayAgain}>
          Play Again
        </button>
        <button className={styles.logoutBtn} onClick={onLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}
