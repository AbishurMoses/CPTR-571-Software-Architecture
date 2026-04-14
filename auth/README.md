## Description

This microservice handles user account creation and authentication. It uses NextJS for the web services and MikroORM with a PostgreSQL database. 

It runs on port 4000.

Required lines for the environment file:

```
# Internal Docker network connection
DB_HOST=auth-db
DB_PORT=5432
DB_USER=user_dev
DB_NAME=db
DB_PASSWORD=devpassword

# Creating POSTGRES instance with these values
POSTGRES_ROOT_PASSWORD=secure_pass
POSTGRES_USER=user_dev             
POSTGRES_PASSWORD=devpassword
POSTGRES_DB=db

#JWT keys
JWT_PRIVATE_KEY="..." # Paste the entire key in quotes
JWT_PUBLIC_KEY="..." # Paste the entire key in quotes
```

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
If a username and password match, a refresh token and an access token are returned as JWTs using RS256 encoding.

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
  "accessToken": "...",
  "refreshToken": "..."
}

// If unsuccessful
{
  "message": "Invalid username or password",
  "error": "Unauthorized",
  "statusCode": 401
}
```

The refresh endpoint generates a new access token when the previous one expires. It accepts a refresh token and validates it with the public key to make sure that it was created using the private key. Then, it decodes it and uses the **sub** field (the user id) to get the user information. Finally, it encodes the user's information into another access token.

This is used in the dual cookie authentication setup to maintain short lived access tokens that can be refreshed for as long as the refresh token stays alive. User's can't forge these tokens due to the RS256 signing.

Refresh request:
```
POST /refresh
{
  "refreshToken": "..."
}
```

Refresh response:
```
// If successful
{
  "accessToken": "..."
}

// If unsuccessful
{
  "message": "Invalid refresh token",
  "error": "Unauthorized",
  "statusCode": 401
}
```
