import { useEffect, useState } from "react";
import styles from "./Leaderboard.module.css";

// Hide and show this using a piece of state to get the leaderboard to rerun. It only refreshes on mount, not "display: none;".

interface Player {
  username: string;
  highscore: number;
}

export default function Leaderboard() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    fetch("http://localhost:2000/leaderboard", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => setPlayers(data));
  }, []);


  return (
  <div className={styles.leaderboard}>
    <h1>Leaderboard</h1>

    <div className={styles["leaderboard-header"]}>
      <span>#</span>
      <span>Player</span>
      <span>Score</span>
    </div>

    <div className={styles["leaderboard-list"]}>
      {players.map((p, i) => (
        <div
          key={p.username}
          className={`${styles.row} ${styles[`rank-${i}`] || ""}`}
        >
          <span className={styles.rank}>{i + 1}</span>
          <span className={styles.name}>{p.username}</span>
          <span className={styles.score}>{p.highscore}</span>
        </div>
      ))}
    </div>
  </div>
);
}