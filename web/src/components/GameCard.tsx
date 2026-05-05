import type { GameData } from "../types/game";
import styles from "./GameCard.module.css";

interface GameCardProps {
  game: GameData;
  side: "left" | "right";
  feedback: null | { correct: boolean };
  showReviews: boolean;
  disabled: boolean;
  onClick: () => void;
}

export default function GameCard({ game, side, feedback, showReviews, disabled, onClick }: GameCardProps) {
  const classNames = [
    styles.card,
    disabled ? styles.disabled : "",
    feedback?.correct === true ? styles.correct : "",
    feedback?.correct === false ? styles.incorrect : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classNames}
      style={{ backgroundImage: `url(${game.image})` }}
      onClick={onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Select ${game.name}`}
      aria-disabled={disabled}
      data-side={side}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className={styles.titleLabel}>{game.name}</span>
      {showReviews && (
        <span className={styles.reviewCount}>
          {game.reviews.toLocaleString()} reviews
        </span>
      )}
    </div>
  );
}
