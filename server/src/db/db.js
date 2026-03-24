const fs = require("fs/promises");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool(
{
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "triage_system",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres"
});



async function connectToDatabase()
{
  const client = await pool.connect();

  try
  {
    await client.query("SELECT 1");
  }
  finally
  {
    client.release();
  }
}



async function initializeDatabase()
{
  const schemaPath = path.join(__dirname, "init.sql");
  const schema = await fs.readFile(schemaPath, "utf8");

  await pool.query(schema);
}



async function closeDatabase()
{
  await pool.end();
}



module.exports =
{
  closeDatabase,
  connectToDatabase,
  initializeDatabase,
  pool
};
