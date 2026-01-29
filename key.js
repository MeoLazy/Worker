function randomHex(len) {
  const chars = "0123456789abcdef";
  let r = "";
  for (let i = 0; i < len; i++) {
    r += chars[Math.floor(Math.random() * chars.length)];
  }
  return r;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===== CREATE KEY =====
    if (url.pathname.startsWith("/create")) {
      const key = randomHex(7);
      await env.KEY_DB.put(key, "valid");

      return new Response(
        JSON.stringify({ key }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // ===== VERIFY KEY =====
    if (url.pathname.startsWith("/verify")) {
      const key = url.searchParams.get("key");
      const valid = key && (await env.KEY_DB.get(key)) === "valid";

      return new Response(
        JSON.stringify({ valid }),
        {
          headers: { "Content-Type": "application/json" },
          status: valid ? 200 : 401
        }
      );
    }

    // ===== NOT FOUND =====
    return new Response(
      JSON.stringify({ error: "Not Found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
