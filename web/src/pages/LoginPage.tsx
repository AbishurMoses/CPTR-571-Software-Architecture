export default function LoginPage() {
    return (
        <div>
            <div id="formGroup">
                <form id="registerForm" className="form">
                    <h1>Register</h1>
                    <input 
                        type="text"
                        placeholder="Username"
                    />
                    <input 
                        type="password"
                        placeholder="Password"
                    />
                    <button type="submit" className="submitBtn">Register</button>
                </form>

                <form id="loginForm" className="form">
                    <h1>Log In</h1>
                    <input 
                        type="text"
                        placeholder="Username"
                    />
                    <input 
                        type="password"
                        placeholder="Password"
                    />
                    <button type="submit" className="submitBtn">Log In</button>
                </form>
            </div>
        </div>
    )
}