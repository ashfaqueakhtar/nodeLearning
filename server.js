// 1. Load environment variables.
require("dotenv").config();

// 2. Import modules.
const express = require("express");
const pool = require("./db");
const userRoutes = require("./routes/user");

// 3. Initialize Express app and middleware.
const app = express();
app.use(express.json());

// 4. Create the users table on startup if it doesn't exist yet.
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

// 5. Mount Routes.
app.use("/user", userRoutes);

// 6. Start Server.
const PORT = process.env.PORT || 5001;

async function startServer() {
    try {
        await createUsersTable();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Could not initialize users table:", error);
        process.exitCode = 1;
        await pool.end();
    }
}

startServer();
