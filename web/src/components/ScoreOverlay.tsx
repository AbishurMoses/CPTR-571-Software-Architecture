import styles from "./ScoreOverlay.module.css";

interface ScoreOverlayProps {
  score: number;
}

export default function ScoreOverlay({ score }: ScoreOverlayProps) {
  return (
    <div className={styles.overlay}>
      <span className={styles.score}>Score: {score}</span>
    </div>
  );
}
