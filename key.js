export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===== TẠO KEY =====
    if (url.pathname === "/create-key" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const expireMinutes = body.expire || 60;

      const key = generateKey();
      const now = Math.floor(Date.now() / 1000);

      await env.KEY_DB.put(
        key,
        JSON.stringify({
          createdAt: now,
          expiredAt: now + expireMinutes * 60,
          used: false
        })
      );

      return json({
        success: true,
        key,
        expire_minutes: expireMinutes
      });
    }

    // ===== VERIFY KEY =====
    if (url.pathname === "/verify-key") {
      const key = url.searchParams.get("key");
      if (!key) return json({ success: false, msg: "Missing key" }, 400);

      const raw = await env.KEY_DB.get(key);
      if (!raw) return json({ success: false, msg: "Invalid key" }, 401);

      const data = JSON.parse(raw);
      const now = Math.floor(Date.now() / 1000);

      if (now > data.expiredAt)
        return json({ success: false, msg: "Key expired" }, 403);

      if (data.used)
        return json({ success: false, msg: "Key already used" }, 403);

      // nếu key dùng 1 lần
      data.used = true;
      await env.KEY_DB.put(key, JSON.stringify(data));

      return json({ success: true, msg: "Key valid" });
    }

    return json({ msg: "OK" });
  }
};

function generateKey() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KEY-${part()}-${part()}-${part()}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
    }
