import { useState, useEffect } from "react";
import type { GameData } from "../types/game";
import { getRandomPair, getRandomGame } from "../services/gameDataService";
import GameCard from "./GameCard";
import ORDivider from "./ORDivider";
import ScoreOverlay from "./ScoreOverlay";
import styles from "./GameBoard.module.css";

const [initialLeft, initialRight] = getRandomPair();

export default function GameBoard() {
  const [leftGame, setLeftGame] = useState<GameData>(initialLeft);
  const [rightGame, setRightGame] = useState<GameData>(initialRight);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [feedback, setFeedback] = useState<null | { side: "left" | "right"; correct: boolean }>(null);

  const handleSelect = (side: "left" | "right") => {
    if (feedback) return;

    const selectedGame = side === "left" ? leftGame : rightGame;
    const otherGame = side === "left" ? rightGame : leftGame;
    const isCorrect = selectedGame.reviews >= otherGame.reviews;

    setFeedback({ side, correct: isCorrect });

    if (isCorrect) {
      const newScore = score + 1;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
      }
    } else {
      setScore(0);
    }
  };

  useEffect(() => {
    if (!feedback) return;

    const timer = setTimeout(() => {
      if (feedback.correct) {
        const winner = feedback.side === "left" ? leftGame : rightGame;
        const newGame = getRandomGame([winner]);
        if (feedback.side === "left") {
          setRightGame(newGame);
        } else {
          setLeftGame(newGame);
        }
      } else {
        const [newLeft, newRight] = getRandomPair();
        setLeftGame(newLeft);
        setRightGame(newRight);
      }
      setFeedback(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [feedback]);

  return (
    <div className={styles.board}>
      <ScoreOverlay score={score} highScore={highScore} />
      <GameCard
        game={leftGame}
        side="left"
        feedback={feedback?.side === "left" ? { correct: feedback.correct } : null}
        disabled={feedback !== null}
        onClick={() => handleSelect("left")}
      />
      <ORDivider />
      <GameCard
        game={rightGame}
        side="right"
        feedback={feedback?.side === "right" ? { correct: feedback.correct } : null}
        disabled={feedback !== null}
        onClick={() => handleSelect("right")}
      />
    </div>
  );
}
