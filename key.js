export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";

    const now = Date.now();
    const TTL = 25 * 60 * 60 * 1000; // 25 giờ

    // ❌ Root
    if (url.pathname === "/") {
      return json({ error: "Not Found" }, 404);
    }

    // ======================
    // 🔑 CREATE / GET KEY
    // ======================
    if (url.pathname === "/create") {
      const ipKey = `ip:${ip}`;
      const oldKey = await env.KEY_DB.get(ipKey);

      // IP đã có key
      if (oldKey) {
        const raw = await env.KEY_DB.get(`key:${oldKey}`);
        if (raw) {
          const data = JSON.parse(raw);
          const remain = data.expires_at - now;

          if (remain > 0) {
            return json({
              key: oldKey,
              status: "OLD_KEY",
              ip: data.ip,
              created_at: new Date(data.created_at).toISOString(),
              remaining_time: formatTime(remain),
            });
          }
        }
      }

      // Tạo key mới
      const key = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
      const data = {
        key,
        ip,
        created_at: now,
        expires_at: now + TTL,
      };

      await env.KEY_DB.put(`key:${key}`, JSON.stringify(data), {
        expirationTtl: TTL / 1000,
      });

      await env.KEY_DB.put(`ip:${ip}`, key, {
        expirationTtl: TTL / 1000,
      });

      return json({
        key,
        status: "NEW_KEY",
        ip,
        created_at: new Date(now).toISOString(),
        expires_at: new Date(now + TTL).toISOString(),
      });
    }

    // ======================
    // ✅ VERIFY KEY
    // ======================
    if (url.pathname === "/verify") {
      const key = url.searchParams.get("key");
      if (!key) return json({ error: "KEY_REQUIRED" }, 400);

      const raw = await env.KEY_DB.get(`key:${key}`);
      if (!raw) {
        return json({ valid: false, error: "KEY_INVALID_OR_EXPIRED" }, 403);
      }

      const data = JSON.parse(raw);
      const remain = data.expires_at - now;

      if (remain <= 0) {
        return json({ valid: false, error: "KEY_EXPIRED" }, 403);
      }

      return json({
        valid: true,
        key,
        ip: data.ip,
        created_at: new Date(data.created_at).toISOString(),
        remaining_time: formatTime(remain),
      });
    }

    return json({ error: "Not Found" }, 404);
  },
};

function formatTime(ms) {
  return {
    hours: Math.floor(ms / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
        }
