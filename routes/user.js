const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../db");
const ApiResponse = require("../network/ApiResponse");

// Standard REST: POST /user (also supports POST /user/create-user for backward compatibility)
router.post(["/", "/create-user"], async (req, res) => {
    const { name, email, password } = req.body || {};

    // Validate fields and assign the error message directly using switch (true).
    let errorMessage = null;

    switch (true) {
        case typeof name !== "string" || !name.trim():
            errorMessage = "Name is required.";
            break;
        case name.trim().length > 50:
            errorMessage = "Name cannot exceed 50 characters.";
            break;
        case typeof email !== "string" || !email.trim():
            errorMessage = "Email is required.";
            break;
        case email.trim().length > 100:
            errorMessage = "Email cannot exceed 100 characters.";
            break;
        case !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()):
            errorMessage = "Please provide a valid email format (e.g. name@example.com).";
            break;
        case typeof password !== "string" || !password:
            errorMessage = "Password is required.";
            break;
        case password.length < 8:
            errorMessage = "Password must be at least 8 characters long.";
            break;
    }

    if (errorMessage) {
        return ApiResponse.send(res, 400, false, errorMessage);
    }

    try {
        // Never store the plain-text password; store a one-way bcrypt hash instead.
        const passwordHash = await bcrypt.hash(password, 12);

        // $1, $2, and $3 are parameter placeholders to safely pass user input to SQL.
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at, updated_at`,
            [name.trim(), email.trim().toLowerCase(), passwordHash]
        );

        return ApiResponse.send(res, 201, true, "User created successfully.", result.rows[0]);
    } catch (error) {
        // PostgreSQL error 23505 means a UNIQUE value (here, email) already exists.
        if (error.code === "23505") {
            return ApiResponse.send(res, 409, false, "That email is already registered.");
        }

        console.error("Failed to create user:", error);
        return ApiResponse.send(res, 500, false, "Unable to create user.");
    }
});

module.exports = router;
