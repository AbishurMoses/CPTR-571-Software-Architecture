import { useState } from 'react'
import './styles/general.css'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'

function App() {
  const [loggedIn, setLoggedIn] = useState(false)

  if (!loggedIn) {
    return <LoginPage />;
  }

  return (
    <>
      <HomePage />
    </>
  )
}

export default App
