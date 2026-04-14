## Description

This microservice handles requests from the front end using Express. 

It uses a dual cookie authentication system that stores a long-lived refresh token and a short lived access token. If the refresh token exists, it allows the access token to be continually refreshed.

It runs on port 2000.

Required lines for the environment file:

```
API_PORT=2000
JWT_PUBLIC_KEY="..." # Paste the entire key in quotes
```

## Validate or Refresh Middleware

Many services are protected so that only users who are logged in can access them. To do this, add the validateOrRefresh middleware to the endpoint. This will validate the two tokens and refresh the access token if needed. If successful, it decodes the access token and adds it to **req.user** For example:

```
app.post('/wakeup', validateOrRefresh, async (req, res) => {
  return res.json({ loggedIn: true });
});
```

A service may check a user's role before letting the user access information. Once the access token has been decoded by the validateOrRefresh middleware, the user's role can be found in **req.user.role** and checked in the service itself.

## Wakeup Service

When the front end is reloaded, a call is made that verifies the two tokens. If the refresh token is invalid the user is logged out. If the refresh token is valid and the access token is invalid, the access token is refreshed. This is done through a useEffect:

```
useEffect(() => {
  fetch("http://localhost:2000/wakeup", { method: "POST", credentials: "include" })
    .then(res => res.json())
    .then(data => {
      if (data.loggedIn) {
        setLoggedIn(true);
      }
    });
}, []);
```

## User Creation Service

To create a user (to register), call the create-user endpoint with a username and password. Usernames must be unique and passwords must be at least 6 characters long, have at least one number, and have at least one letter. It does not require any authentication:

```
fetch("http://localhost:2000/create-user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "TestUser",
    password: "Pass4TestUser"
  })
})
```