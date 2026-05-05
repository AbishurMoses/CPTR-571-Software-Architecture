import { useState, useEffect, useRef } from "react";
import type { GameData } from "../types/game";
import { getRandomPair, getRandomGame } from "../services/gameDataService";
import GameCard from "./GameCard";
import ORDivider from "./ORDivider";
import ScoreOverlay from "./ScoreOverlay";
import styles from "./GameBoard.module.css";

interface GameBoardProps {
  games: GameData[]; // Pool of games loaded from the API
  onGameOver?: (losingGame: GameData, finalScore: number) => void;
}

export default function GameBoard({ games, onGameOver }: GameBoardProps) {
  const [leftGame, setLeftGame] = useState<GameData>(() => getRandomPair(games)[0]);
  const [rightGame, setRightGame] = useState<GameData>(() => getRandomPair(games)[1]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<null | { side: "left" | "right"; correct: boolean }>(null);
  const peakScoreRef = useRef(0);
  // Track all games that have already appeared so we don't repeat
  const seenRef = useRef<Set<string>>(new Set());

  // Re-initialize when games pool changes (e.g. platform switch)
  useEffect(() => {
    seenRef.current.clear();
    const [l, r] = getRandomPair(games);
    seenRef.current.add(l.name);
    seenRef.current.add(r.name);
    setLeftGame(l);
    setRightGame(r);
    setScore(0);
    peakScoreRef.current = 0;
    setFeedback(null);
  }, [games]);

  const submitHighScore = async (finalScore: number) => {
    if (finalScore <= 0) return;
    try {
      await fetch("http://localhost:2000/highscore", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ score: finalScore }),
      });
    } catch {
      // Silent fail — game still works
    }
  };

  const handleSelect = (side: "left" | "right") => {
    if (feedback) return;

    const selectedGame = side === "left" ? leftGame : rightGame;
    const otherGame = side === "left" ? rightGame : leftGame;
    const isCorrect = selectedGame.reviews >= otherGame.reviews;

    setFeedback({ side, correct: isCorrect });

    if (isCorrect) {
      const newScore = score + 1;
      setScore(newScore);
      if (newScore > peakScoreRef.current) {
        peakScoreRef.current = newScore;
      }
    }
  };

  useEffect(() => {
    if (!feedback) return;

    const timer = setTimeout(async () => {
      if (feedback.correct) {
        const winner = feedback.side === "left" ? leftGame : rightGame;
        // Exclude all previously seen games so we don't repeat
        const seenGames = games.filter((g) => seenRef.current.has(g.name));
        const newGame = getRandomGame(games, seenGames);
        seenRef.current.add(newGame.name);

        // If we've exhausted the pool, reset seen (keeps the game going)
        if (seenRef.current.size >= games.length) {
          seenRef.current.clear();
          seenRef.current.add(winner.name);
          seenRef.current.add(newGame.name);
        }

        if (feedback.side === "left") {
          setRightGame(newGame);
        } else {
          setLeftGame(newGame);
        }
        setFeedback(null);
      } else {
        const losingGame = feedback.side === "left" ? leftGame : rightGame;
        await submitHighScore(peakScoreRef.current);
        if (onGameOver) {
          onGameOver(losingGame, score);
        } else {
          // Reset everything on game over without exit
          seenRef.current.clear();
          setScore(0);
          const [newLeft, newRight] = getRandomPair(games);
          seenRef.current.add(newLeft.name);
          seenRef.current.add(newRight.name);
          setLeftGame(newLeft);
          setRightGame(newRight);
          setFeedback(null);
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [feedback]);

  return (
    <div className={styles.board}>
      <ScoreOverlay score={score} />
      <GameCard
        game={leftGame}
        side="left"
        feedback={feedback?.side === "left" ? { correct: feedback.correct } : null}
        showReviews={feedback !== null}
        disabled={feedback !== null}
        onClick={() => handleSelect("left")}
      />
      <ORDivider />
      <GameCard
        game={rightGame}
        side="right"
        feedback={feedback?.side === "right" ? { correct: feedback.correct } : null}
        showReviews={feedback !== null}
        disabled={feedback !== null}
        onClick={() => handleSelect("right")}
      />
    </div>
  );
}
