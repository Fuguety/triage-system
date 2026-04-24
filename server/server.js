require("dotenv").config();

const app = require("./src/app");
const db = require("./src/db/database");

const PORT = process.env.PORT || 5000;

async function startServer()
{
  try
  {
    await db.connectToDatabase();
    await db.initializeDatabase();

    app.listen(PORT, () =>
    {
      console.log(`API running on http://localhost:${PORT}`);
      console.log("PostgreSQL connection established");
    });
  }
  catch (error)
  {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}



startServer();

