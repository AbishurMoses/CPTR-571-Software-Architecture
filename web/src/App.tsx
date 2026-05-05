import { useEffect, useState } from 'react'
import './styles/general.css'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ExitPage from './pages/ExitPage'
import type { GameData } from './types/game'

type Page = "login" | "home" | "exit";

interface UserInfo {
  id: number;
  username: string;
}

function App() {
  const [page, setPage] = useState<Page>("login");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [exitGame, setExitGame] = useState<GameData | null>(null);
  const [exitScore, setExitScore] = useState(0);

  useEffect(() => {
    fetch("http://localhost:2000/wakeup", { method: "POST", credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          setUser(data.user);
          setPage("home");
        }
      });
  }, []);

  const handleLogin = (userInfo: UserInfo) => {
    setUser(userInfo);
    setPage("home");
  };

  const handleGameOver = (losingGame: GameData, finalScore: number) => {
    setExitGame(losingGame);
    setExitScore(finalScore);
    setPage("exit");
  };

  const handlePlayAgain = () => {
    setExitGame(null);
    setExitScore(0);
    setPage("home");
  };

  const handleLogout = () => {
    document.cookie = "access_token=; Max-Age=0; path=/;";
    document.cookie = "refresh_token=; Max-Age=0; path=/;";
    setUser(null);
    setExitGame(null);
    setExitScore(0);
    setPage("login");
  };

  if (page === "login") {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (page === "exit" && exitGame) {
    return (
      <ExitPage
        game={exitGame}
        finalScore={exitScore}
        onPlayAgain={handlePlayAgain}
        onLogout={handleLogout}
      />
    );
  }

  return <HomePage onGameOver={handleGameOver} />;
}

export default App
