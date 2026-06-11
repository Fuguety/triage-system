const router = require("express").Router();
const aiService = require("../services/ai.service");

router.get("/", (req, res) =>
{
  res.json({ status: "OK" });
});




router.get("/ai", async (req, res) =>
{
  try
  {
    return res.json(await aiService.testHuggingFaceConnection());
  }
  catch (error)
  {
    return res.status(500).json(
    {
      configured: Boolean(process.env.HF_TOKEN),
      model: process.env.HF_MODEL || "openai/gpt-oss-20b",
      status: "failed",
      message: "AI health check failed."
    });
  }
});

module.exports = router;

