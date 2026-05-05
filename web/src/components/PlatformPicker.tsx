import type { Platform } from "../types/game";
import styles from "./PlatformPicker.module.css";

interface PlatformPickerProps {
  onSelect: (platform: Platform) => void;
  loading?: boolean;
}

export default function PlatformPicker({ onSelect, loading }: PlatformPickerProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="platform-title">
      <div className={styles.modal}>
        <h2 id="platform-title" className={styles.title}>
          Choose Your Platform
        </h2>
        <p className={styles.subtitle}>
          {loading
            ? "Loading games..."
            : "Which game library do you want to play with?"}
        </p>
        <div className={styles.buttons}>
          <button
            className={`${styles.btn} ${styles.steam}`}
            onClick={() => onSelect("steam")}
            disabled={loading}
            aria-label="Play with Steam games"
          >
            Steam
          </button>
          <button
            className={`${styles.btn} ${styles.epic}`}
            onClick={() => onSelect("epic")}
            disabled={loading}
            aria-label="Play with Epic Games"
          >
            Epic Games
          </button>
        </div>
      </div>
    </div>
  );
}
