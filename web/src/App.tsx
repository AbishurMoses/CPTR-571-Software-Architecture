import { useEffect, useState } from 'react'
import './styles/general.css'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("http://localhost:2000/wakeup", { method: "POST", credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          setLoggedIn(true);
        }
      });
  }, []);

  if (!loggedIn) {
    return <LoginPage setLoggedIn={setLoggedIn} />;
  }

  return (
    <>
      <HomePage />
    </>
  )
}

export default App
