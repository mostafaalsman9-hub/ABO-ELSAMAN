const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { Octokit } = require("@octokit/rest");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use(rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false
}));

app.get("/", (req, res) => {
  res.json({
    name: "ABO ELSAMAN STUDIO API",
    status: "running"
  });
});

app.post("/create", async (req, res) => {
  try {
    const { app_name, website_url, application_id } = req.body;

    if (!app_name || !website_url || !application_id) {
      return res.status(400).json({ error: "كل البيانات مطلوبة" });
    }

    let url;
    try {
      url = new URL(website_url);
    } catch {
      return res.status(400).json({ error: "رابط الموقع غير صحيح" });
    }

    if (url.protocol !== "https:") {
      return res.status(400).json({ error: "يجب استخدام رابط HTTPS" });
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(application_id)) {
      return res.status(400).json({ error: "معرّف التطبيق غير صحيح" });
    }

    if (typeof app_name !== "string" || app_name.length > 40) {
      return res.status(400).json({ error: "اسم التطبيق طويل أو غير صحيح" });
    }

    if (!process.env.GITHUB_TOKEN) {
      return res.status(500).json({ error: "إعداد GitHub غير مكتمل" });
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    await octokit.rest.actions.createWorkflowDispatch({
      owner: "mostafaalsman9-hub",
      repo: "ABO-ELSAMAN",
      workflow_id: "build-apk.yml",
      ref: "main",
      inputs: {
        app_name,
        website_url: url.toString(),
        application_id
      }
    });

    res.status(202).json({
      message: "تم إرسال طلب بناء التطبيق إلى GitHub",
      status: "queued"
    });

  } catch (error) {
    console.error("GitHub error:", error.message);
    res.status(500).json({
      error: "تعذر إرسال طلب البناء"
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`ABO ELSAMAN API running on port ${port}`);
});
