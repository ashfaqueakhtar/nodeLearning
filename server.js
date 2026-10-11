// 1. Load values from the .env file (such as DATABASE_URL) into process.env.
require("dotenv").config();

// 2. Import the libraries and database connection used by this server.
const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("./db");
const ApiResponse = require("./network/ApiResponse");

// 3. Create the Express application and let it read JSON request bodies.
const app = express();
app.use(express.json());

// 4. Create the users table when the server starts, if it does not exist yet.
async function createUsersTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
}

// 5. POST /create-user creates a user from JSON sent in the request body.
app.post("/create-user", async (req, res) => {
    // Expect a body like: { "name": "Asha", "email": "asha@example.com", "password": "..." }
    const { name, email, password } = req.body || {};

    // 1. Identify which validation rule failed (if any).
    let errorKey = null;

    if (typeof name !== "string" || !name.trim()) {
        errorKey = "NAME_REQUIRED";
    } else if (name.trim().length > 50) {
        errorKey = "NAME_TOO_LONG";
    } else if (typeof email !== "string" || !email.trim()) {
        errorKey = "EMAIL_REQUIRED";
    } else if (email.trim().length > 100) {
        errorKey = "EMAIL_TOO_LONG";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errorKey = "EMAIL_INVALID";
    } else if (typeof password !== "string" || !password) {
        errorKey = "PASSWORD_REQUIRED";
    } else if (password.length < 8) {
        errorKey = "PASSWORD_TOO_SHORT";
    }

    // 2. Resolve error message via switch statement and send response once.
    if (errorKey) {
        let errorMessage;
        switch (errorKey) {
            case "NAME_REQUIRED":
                errorMessage = "Name is required.";
                break;
            case "NAME_TOO_LONG":
                errorMessage = "Name cannot exceed 50 characters.";
                break;
            case "EMAIL_REQUIRED":
                errorMessage = "Email is required.";
                break;
            case "EMAIL_TOO_LONG":
                errorMessage = "Email cannot exceed 100 characters.";
                break;
            case "EMAIL_INVALID":
                errorMessage = "Please provide a valid email format (e.g. name@example.com).";
                break;
            case "PASSWORD_REQUIRED":
                errorMessage = "Password is required.";
                break;
            case "PASSWORD_TOO_SHORT":
                errorMessage = "Password must be at least 8 characters long.";
                break;
            default:
                errorMessage = "Invalid input.";
        }
        return ApiResponse.send(res, 400, false, errorMessage);
    }

    try {
        // Never store the plain-text password; store a one-way bcrypt hash instead.
        const passwordHash = await bcrypt.hash(password, 12);

        // $1, $2, and $3 are parameter placeholders to safely pass user input to SQL.
        // RETURNING sends the created user's public fields back from PostgreSQL.
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at, updated_at`,
            [name.trim(), email.trim().toLowerCase(), passwordHash]
        );

        // 201 means a new resource (the user) was successfully created.
        return ApiResponse.send(res, 201, true, "User created successfully.", result.rows[0]);
    } catch (error) {
        // PostgreSQL error 23505 means a UNIQUE value (here, email) already exists.
        if (error.code === "23505") {
            return ApiResponse.send(res, 409, false, "That email is already registered.");
        }

        // Log unexpected server/database errors; do not expose details to the client.
        console.error("Failed to create user:", error);
        return ApiResponse.send(res, 500, false, "Unable to create user.");
    }
});

// 6. Create the table first, then start accepting HTTP requests.
const PORT = process.env.PORT || 5001;

async function startServer() {
    try {
        await createUsersTable();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        // If setup fails, do not start a server that cannot save users.
        console.error("Could not initialize users table:", error);
        process.exitCode = 1;
        await pool.end();
    }
}

// Begin the startup process.
startServer();
