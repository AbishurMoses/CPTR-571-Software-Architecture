import styles from "./ScoreOverlay.module.css";

interface ScoreOverlayProps {
  score: number;
  highScore: number;
}

export default function ScoreOverlay({ score, highScore }: ScoreOverlayProps) {
  return (
    <div className={styles.overlay}>
      <span className={styles.highScore}>High score: {highScore}</span>
      <span className={styles.score}>Score: {score}</span>
    </div>
  );
}
