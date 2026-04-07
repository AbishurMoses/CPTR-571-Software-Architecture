import { useState } from "react"

export default function LoginPage() {
    const [registerData, setRegisterData] = useState({ username: "", password: "" });
    const [loginData, setLoginData] = useState({ username: "", password: "" });

    const handleRegisterSubmit = async (e: any) => {
        e.preventDefault();
        const response = await fetch("http://localhost:4000/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registerData)
        });
        const data = await response.json();
        console.log(registerData);
        console.log("Register response: ", data);
    };

    const handleLoginSubmit = async (e: any) => {
        e.preventDefault();
        const response = await fetch("http://localhost:4000/authenticate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginData)
        });
        const data = await response.json();

        console.log(loginData);
        console.log("Login response: ", data);
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
            </form>
        </div>
    );
}