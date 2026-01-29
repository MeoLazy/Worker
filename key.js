function randomHex(len) {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===== TẠO KEY HEX 7 KÝ TỰ =====
    if (url.pathname === "/create") {
      const key = randomHex(7);

      await env.KEY_DB.put(key, "valid");

      return new Response(
        JSON.stringify({ key }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // ===== VERIFY KEY =====
    if (url.pathname === "/verify") {
      const key = url.searchParams.get("key");
      if (!key) {
        return new Response(
          JSON.stringify({ valid: false, reason: "missing_key" }),
          { status: 400 }
        );
      }

      const value = await env.KEY_DB.get(key);
      return new Response(
        JSON.stringify({ valid: value === "valid" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("OK");
  }
};
