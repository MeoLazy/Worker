export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // ===== CORS HEADERS =====
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    // ===== OPTIONS (BẮT BUỘC PHẢI CÓ) =====
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // ===== LẤY DOMAIN GỌI API =====
    const origin = request.headers.get("Origin") || "";
    const referer = request.headers.get("Referer") || "";

    const isTurbolite =
      origin.includes("turbolite.xyz") ||
      referer.includes("turbolite.xyz");

    // =========================
    // 🔑 API TẠO KEY
    // =========================
    if (pathname === "/create-key") {

      // ❌ Chỉ cho domain turbolite.xyz
      if (!isTurbolite) {
        return new Response(JSON.stringify({
          status: "DENIED",
          message: "Domain not allowed"
        }), {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      // Tạo key
      const key = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

      return new Response(JSON.stringify({
        status: "OK",
        key: key,
        created_at: Date.now()
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // =========================
    // ✅ API VERIFY KEY
    // =========================
    if (pathname === "/verify-key") {
      const key = url.searchParams.get("key");

      if (!key) {
        return new Response(JSON.stringify({
          status: "NO_KEY"
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      // Demo: key hợp lệ nếu dài >= 10
      if (key.length >= 10) {
        return new Response(JSON.stringify({
          status: "VALID",
          key: key
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      return new Response(JSON.stringify({
        status: "INVALID"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // =========================
    // ❌ NOT FOUND
    // =========================
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders
    });
  }
};