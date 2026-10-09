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
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// 5. POST /create-user creates a user from JSON sent in the request body.
app.post("/create-user", async (req, res) => {
    // Expect a body like: { "name": "Asha", "email": "asha@example.com", "password": "..." }
    const { name, email, password } = req.body || {};

    // Validate required fields before doing any database work.
    if (
        typeof name !== "string" || !name.trim() || name.trim().length > 5 ||
        typeof email !== "string" || !email.trim() || email.trim().length > 10 ||
        typeof password !== "string" || password.length < 8
    ) {
        return ApiResponse.send(
            res,
            400,
            false,
            "Provide a name (up to 5 characters), email (up to 10 characters), and password (at least 8 characters)."
        );
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

// 6. Create the table first, then start accepting HTTP requests on port 5000.
async function startServer() {
    try {
        await createUsersTable();
        app.listen(5000, () => {
            console.log("Server running on port 5000");
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
