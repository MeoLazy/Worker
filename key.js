// ================= CORS =================
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// ================= WORKER =================
export default {
  async fetch(request, env) {

    // ✅ CORS preflight (BẮT BUỘC)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    const url = new URL(request.url);
    const now = Date.now();
    const TTL = 30 * 60 * 60 * 1000; // 30 giờ

    // ===== IP (ưu tiên IPv4) =====
    const ip =
      request.headers.get("CF-Connecting-IP-V4") ||
      request.headers.get("CF-Connecting-IP") ||
      "unknown";

    // ===== META =====
    const ua = request.headers.get("User-Agent") || "";
    const os = detectOS(ua);
    const browser = detectBrowser(ua);
    const country = request.cf?.country || "Unknown";

    // ===== ROOT =====
    if (url.pathname === "/") {
      return json({ error: "Not Found" }, 404);
    }

    // ======================
    // 🔑 CREATE / GET KEY
    // ======================
    if (url.pathname === "/create") {
      const ipBind = `ip:${ip}`;

      // 🔁 Nếu IP đã có key → trả lại
      const oldKey = await env.KEY_DB.get(ipBind);
      if (oldKey) {
        const raw = await env.KEY_DB.get(`key:${oldKey}`);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.expires_at > now) {
            return json(format(data, now, "OLD_KEY"));
          }
        }
      }

      // 🆕 Tạo key mới
      const key = generateKey(10);

      const data = {
        key,
        ip,
        country,
        os,
        browser,
        created_at: now,
        expires_at: now + TTL
      };

      await env.KEY_DB.put(`key:${key}`, JSON.stringify(data), {
        expirationTtl: TTL / 1000
      });

      await env.KEY_DB.put(ipBind, key, {
        expirationTtl: TTL / 1000
      });

      return json(format(data, now, "NEW_KEY"));
    }

    // ======================
    // ✅ VERIFY KEY
    // ======================
    if (url.pathname === "/verify") {
      const key = url.searchParams.get("key");
      if (!key) return json({ error: "KEY_REQUIRED" }, 400);

      const raw = await env.KEY_DB.get(`key:${key}`);
      if (!raw) {
        return json({ valid: false, error: "KEY_INVALID" }, 403);
      }

      const data = JSON.parse(raw);
      if (data.expires_at <= now) {
        return json({ valid: false, error: "KEY_EXPIRED" }, 403);
      }

      return json({
        valid: true,
        ...format(data, now)
      });
    }

    return json({ error: "Not Found" }, 404);
  }
};

// ================= HELPERS =================

function generateKey(len) {
  return crypto.randomUUID().replace(/-/g, "").slice(0, len);
}

function detectOS(ua) {
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os|macintosh/i.test(ua)) return "MacOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

function detectBrowser(ua) {
  if (/fbav|fban/i.test(ua)) return "Facebook In-App";
  if (/instagram/i.test(ua)) return "Instagram In-App";
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/edge/i.test(ua)) return "Edge";
  return "Other";
}

function format(data, now, status = "OK") {
  return {
    status,
    key: data.key,
    ip: data.ip,
    country: data.country,
    os: data.os,
    browser: data.browser,
    created_at: new Date(data.created_at).toISOString(),
    remaining_time: formatTime(data.expires_at - now)
  };
}

function formatTime(ms) {
  return {
    hours: Math.floor(ms / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000)
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS
    }
  });
}