// ================= CORS =================
const ALLOWED_CREATE_DOMAIN = "https://turbolite.asia";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export default {
  async fetch(request, env) {

    // ===== CORS preflight =====
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    const url = new URL(request.url);
    const now = Date.now();
    const TTL = 30 * 60 * 60 * 1000; // 30 giờ

    const ip =
      request.headers.get("CF-Connecting-IP-V4") ||
      request.headers.get("CF-Connecting-IP") ||
      "unknown";

    // ======================
    // ROOT
    // ======================
    if (url.pathname === "/") {
      return json({ success: false, error: "NOT_FOUND" }, 404);
    }

    // ======================
    // 🔑 CREATE KEY (CHỈ CHO turbolite.xyz)
    // ======================
    if (url.pathname === "/key") {

      // 🔒 Check domain
      const origin = request.headers.get("Origin");
      const referer = request.headers.get("Referer");

      const allowed =
        (origin && origin.startsWith(ALLOWED_CREATE_DOMAIN)) ||
        (referer && referer.startsWith(ALLOWED_CREATE_DOMAIN));

      if (!allowed) {
        return json(
          { success: false, error: "FORBIDDEN_DOMAIN" },
          403
        );
      }

      const ipBind = `ip:${ip}`;

      // Nếu IP đã có key còn hạn → trả lại
      const oldKey = await env.KEY_DB.get(ipBind);
      if (oldKey) {
        const raw = await env.KEY_DB.get(`key:${oldKey}`);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.expires_at > now) {
            return json(buildCreateResponse(data, now));
          }
        }
      }

      // Tạo key mới
      const key = generateKey(15);

      const data = {
        key,
        ip,
        expires_at: now + TTL
      };

      await env.KEY_DB.put(`key:${key}`, JSON.stringify(data), {
        expirationTtl: TTL / 1000
      });

      await env.KEY_DB.put(ipBind, key, {
        expirationTtl: TTL / 1000
      });

      return json(buildCreateResponse(data, now));
    }

    // ======================
    // ✅ VERIFY KEY (PUBLIC)
    // ======================
    if (url.pathname === "/verify") {
      const key = url.searchParams.get("key");
      if (!key) {
        return json({ success: false, error: "KEY_REQUIRED" }, 400);
      }

      const raw = await env.KEY_DB.get(`key:${key}`);
      if (!raw) {
        return json({ success: false, error: "KEY_INVALID" }, 403);
      }

      const data = JSON.parse(raw);
      if (data.expires_at <= now) {
        return json({ success: false, error: "KEY_EXPIRED" }, 403);
      }

      return json({
        success: true,
        expires_at: new Date(data.expires_at).toISOString(),
        time_remaining: formatTime(data.expires_at - now)
      });
    }

    return json({ success: false, error: "NOT_FOUND" }, 404);
  }
};

// ================= HELPERS =================

function generateKey(len) {
  return crypto.randomUUID().replace(/-/g, "").slice(0, len);
}

function formatTime(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const pad = n => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}`;
}

function buildCreateResponse(data, now) {
  return {
    success: true,
    key: data.key,
    expires_at: new Date(data.expires_at).toISOString(),
    time_remaining: formatTime(data.expires_at - now)
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