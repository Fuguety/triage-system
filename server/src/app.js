const express = require("express");
const cors = require("cors");

const healthRouter = require("./routers/health.router");
const triageRouter = require("./routers/triage.router");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);
app.use("/triage", triageRouter);

module.exports = app;