






















const OWNER = "mostafaalsman9-hub";
const REPO = "ABO-ELSAMAN";
const WORKFLOW = "build-apk.yml";
const PROJECT_ID = "college-system-3d6f4";

let cachedKeys = null;
let keysExpiry = 0;

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }
  });
}

function decode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(
    normalized.length + (4 - normalized.length % 4) % 4, "="
  ));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(decode(parts[1])));

  if (header.alg !== "RS256" || !header.kid) return false;

  const now = Math.floor(Date.now() / 1000);

  if (
    payload.aud !== PROJECT_ID ||
    payload.iss !== `https://securetoken.google.com/${PROJECT_ID}` ||
    !payload.sub ||
    payload.sub.length > 128 ||
    payload.exp <= now ||
    payload.iat > now ||
    payload.auth_time > now
  ) return false;

  if (!cachedKeys || Date.now() > keysExpiry) {
    const res = await fetch(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
    );
    if (!res.ok) return false;
    cachedKeys = await res.json();
    keysExpiry = Date.now() + 3600000;
  }

  const keyData = cachedKeys.keys.find(k => k.kid === header.kid);
  if (!keyData) return false;

  const key = await crypto.subtle.importKey(
    "jwk",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decode(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return response({ ok: true });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return response({
        name: "ABO ELSAMAN STUDIO API",
        status: "running"
      });
    }

    if (request.method !== "POST" || url.pathname !== "/create") {
      return response({ error: "Not found" }, 404);
    }

    if (!env.GITHUB_TOKEN) {
      return response({ error: "GitHub token is not configured" }, 503);
    }

    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token) {
      return response({ error: "يجب تسجيل الدخول أولاً" }, 401);
    }

    try {
      if (!(await verifyToken(token))) {
        return response({ error: "رمز تسجيل الدخول غير صالح" }, 401);
      }
    } catch {
      return response({ error: "فشل التحقق من تسجيل الدخول" }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return response({ error: "بيانات غير صحيحة" }, 400);
    }

    const { app_name, website_url, application_id } = body;

    if (
      typeof app_name !== "string" ||
      !app_name.trim() ||
      app_name.length > 40
    ) {
      return response({ error: "اسم التطبيق غير صحيح" }, 400);
    }

    try {
      const site = new URL(website_url);
      if (site.protocol !== "https:") throw new Error();
    } catch {
      return response({ error: "رابط الموقع يجب أن يكون HTTPS" }, 400);
    }

    if (
      typeof application_id !== "string" ||
      !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(application_id)
    ) {
      return response({ error: "معرّف التطبيق غير صحيح" }, 400);
    }

    const github = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "ABO-ELSAMAN-STUDIO"
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            app_name: app_name.trim(),
            website_url,
            application_id
          }
        })
      }
    );

    if (github.status !== 204) {
      return response({
        error: "فشل إرسال طلب بناء التطبيق",
        status: github.status
      }, 502);
    }

    return response({
      success: true,
      message: "تم إرسال طلب بناء التطبيق بنجاح"
    });
  }
};
