import { useState } from "react"

interface LoginPageProps {
    setLoggedIn: (value: boolean) => void;
}

export default function LoginPage({ setLoggedIn }: LoginPageProps) {
    const [registerData, setRegisterData] = useState({ username: "", password: "" });
    const [loginData, setLoginData] = useState({ username: "", password: "" });
    const [registerMessage, setRegisterMessage] = useState("");
    const [loginMessage, setLoginMessage] = useState("");


    const handleRegisterSubmit = async (e: any) => {
        e.preventDefault();
        fetch("http://localhost:2000/create-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registerData)
        })
        .then(res => res.json())
        .then(data => {
            console.log(data)
            setRegisterMessage(data.message);
        });
    };

    const handleLoginSubmit = async (e: any) => {
        e.preventDefault();
        fetch("http://localhost:2000/login-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(loginData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.loggedIn) {
                setLoggedIn(true);
            } else {
                setLoginMessage(data.message);
            }
        });
    };

    return (
        <div id="formGroup">
            <form id="registerForm" className="form" onSubmit={handleRegisterSubmit}>
                <h1>Register</h1>
                <input 
                    type="text"
                    placeholder="Username"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                />
                <input 
                    type="password"
                    placeholder="Password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                />
                <button type="submit" className="submitBtn">Register</button>
                <span id="registerResponse">{registerMessage}</span>
            </form>

            <form id="loginForm" className="form" onSubmit={handleLoginSubmit}>
                <h1>Log In</h1>
                <input 
                    type="text"
                    placeholder="Username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                />
                <input 
                    type="password"
                    placeholder="Password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                />
                <button type="submit" className="submitBtn">Log In</button>
                <span id="loginResponse">{loginMessage}</span>
            </form>
        </div>
    );
}