const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { Octokit } = require("@octokit/rest");
const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    name: "ABO ELSAMAN STUDIO API",
    status: "running"
  });
});

async function verifyFirebase(req, res, next) {
  try {
    if (!getApps().length) {
      return res.status(503).json({
        error: "Firebase غير مربوط بعد"
      });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error: "يجب تسجيل الدخول أولاً"
      });
    }

    req.user = await getAuth().verifyIdToken(token);
    next();
  } catch (error) {
    return res.status(401).json({
      error: "جلسة الدخول غير صالحة"
    });
  }
}

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

app.post("/create", createLimiter, verifyFirebase, async (req, res) => {
  try {
    const { app_name, website_url, application_id } = req.body;

    if (!app_name || !website_url || !application_id) {
      return res.status(400).json({
        error: "كل البيانات مطلوبة"
      });
    }

    if (typeof app_name !== "string" ||
        app_name.trim().length === 0 ||
        app_name.length > 40) {
      return res.status(400).json({
        error: "اسم التطبيق غير صحيح"
      });
    }

    let url;
    try {
      url = new URL(website_url);
    } catch {
      return res.status(400).json({
        error: "رابط الموقع غير صحيح"
      });
    }

    if (url.protocol !== "https:") {
      return res.status(400).json({
        error: "يجب استخدام رابط HTTPS"
      });
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(application_id)) {
      return res.status(400).json({
        error: "معرّف التطبيق غير صحيح"
      });
    }

    if (!process.env.GITHUB_TOKEN) {
      return res.status(500).json({
        error: "إعداد GitHub غير مكتمل"
      });
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
        app_name: app_name.trim(),
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

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountJson) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);

    if (serviceAccount.project_id !== "college-system-3d6f4") {
      throw new Error("Firebase project ID mismatch");
    }

    initializeApp({
      credential: cert(serviceAccount)
    });

    console.log("Firebase Admin initialized");
  } catch (error) {
    console.error("Firebase initialization failed:", error.message);
    process.exit(1);
  }
} else {
  console.log("Firebase credentials not configured yet");
}

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`ABO ELSAMAN API running on port ${port}`);
});
