import { useState } from "react"
import '../styles/login.css'

interface LoginPageProps {
    onLogin: (user: { id: number; username: string }) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
    const [loginRegisterSwitch, setLoginRegisterSwitch] = useState("login");
    const [registerData, setRegisterData] = useState({ username: "", password: "" });
    const [loginData, setLoginData] = useState({ username: "", password: "" });
    const [registerMessage, setRegisterMessage] = useState("");
    const [loginMessage, setLoginMessage] = useState("");

    const handleSwitchClick = async (method: string) => {
        setLoginRegisterSwitch(method);
    }

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
                onLogin(data.user);
            } else {
                setLoginMessage(data.message);
            }
        });
    };

    return (
        <>
            <h1 style={{paddingTop: "50px"}}>The Higher or Lower Game!</h1>
            <h3 style={{paddingBottom: "30px"}}>To play, log in or register below.</h3>

            <div className="switchContainer">
                <span className={`loginSwitch ${loginRegisterSwitch === "login" ? "selectedSwitch" : ""}`} onClick={() => handleSwitchClick("login")}>Log in</span>
                <span className={`registerSwitch ${loginRegisterSwitch === "register" ? "selectedSwitch" : ""}`} onClick={() => handleSwitchClick("register")}>Register</span>
            </div>

            <div id="formGroup">
                <form id="registerForm" className={`form ${loginRegisterSwitch === "register" ? "selectedForm" : "slide-right"}`} onSubmit={handleRegisterSubmit}>
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

                <form id="loginForm" className={`form ${loginRegisterSwitch === "login" ? "selectedForm" : "slide-left"}`} onSubmit={handleLoginSubmit}>
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

        </>
    );
}
