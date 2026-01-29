export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===== CREATE KEY =====
    if (url.pathname === "/create-key" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const expireMinutes = body.expire || 60;

      const key = generateKey();
      const now = Math.floor(Date.now() / 1000);

      const data = {
        createdAt: now,
        expiredAt: now + expireMinutes * 60,
        used: false
      };

      await env.KEY_DB.put(key, JSON.stringify(data));

      return json({
        success: true,
        key,
        expired_in: `${expireMinutes} minutes`
      });
    }

    // ===== VERIFY KEY =====
    if (url.pathname === "/verify-key") {
      const key = url.searchParams.get("key");
      if (!key) return json({ success: false, message: "Missing key" }, 400);

      const raw = await env.KEY_DB.get(key);
      if (!raw) return json({ success: false, message: "Invalid key" }, 401);

      const data = JSON.parse(raw);
      const now = Math.floor(Date.now() / 1000);

      if (now > data.expiredAt)
        return json({ success: false, message: "Key expired" }, 403);

      if (data.used)
        return json({ success: false, message: "Key already used" }, 403);

      // Nếu muốn key chỉ dùng 1 lần
      data.used = true;
      await env.KEY_DB.put(key, JSON.stringify(data));

      return json({
        success: true,
        message: "Key valid"
      });
    }

    return json({ message: "Not Found" }, 404);
  }
};

function generateKey() {
  const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `UGP-${part()}-${part()}-${part()}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}