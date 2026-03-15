const express = require("express");
const cors = require("cors");

const adminRouter = require("./routers/admin.router");
const authRouter = require("./routers/auth.router");
const healthRouter = require("./routers/health.router");
const triageRouter = require("./routers/triage.router");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/admin", adminRouter);
app.use("/auth", authRouter);
app.use("/health", healthRouter);
app.use("/triage", triageRouter);

module.exports = app;
