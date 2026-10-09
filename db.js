require("dotenv").config();

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Add it to your .env file.");
}

const connectionString = new URL(process.env.DATABASE_URL);
connectionString.searchParams.delete("sslmode");

const pool = new Pool({
  connectionString: connectionString.toString(),
  // Development-only workaround for the certificate-chain error seen with this Neon setup.
  // Use proper certificate verification in production.
  ssl: { rejectUnauthorized: false },
});

pool.on("connect", () => {
  console.log("PostgreSQL connected successfully :)");
});

pool.on("error", (err) => {
  console.error("PostgreSQL error: ", err);
});

module.exports = pool;