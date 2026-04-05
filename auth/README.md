## Description

This microservice handles user account creation and authentication. It uses NextJS for the web services and MikroORM with a PostgreSQL database. 

It runs on port 4000.

## Health service

Retrieve system health request:
```
GET /health
No body
```

Retrieve system health response:
```
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-04-03T13:14:51.606Z"
}
```

## User services
Usernames must be unique and passwords must be at least 6 characters long and contain at least one lowercase letter and a number. 

An optional role can be added which defaults to 1 if missing. See permission definitions below:
```
1: Basic user
2: Manager
3: Admin
```

Create user request:
```
POST /users
{
  "username": "TestUser",
  "password": "Pass4TestUser"

  // Optional... defaults to 1
  "role": 3
}
```

Create user response:
```
// If successful
{
  "username": "TestUser",
  "role": 1
}

// If username already exists
{
  "message": "Username already exists",
  "error": "Conflict",
  "statusCode": 409
}
```

## Authentication service
If a username and password match, a JWT token is generated using the private key and returned. This must be decrypted with the public key and checked before performing protected actions.

Authenticate user request:
```
POST /authenticate
{
  "username": "TestUser",
  "password": "Pass4TestUser"
}
```

Authenticate user response:
```
// If successful
{
  "token": "eyJhbGciOiJSU..."
}

// If unsuccessful
{
  "message": "Invalid username or password",
  "error": "Unauthorized",
  "statusCode": 401
}
```
