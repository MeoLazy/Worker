export default {
  async fetch(req) {
    const url = new URL(req.url);
    const ip = url.searchParams.get("ip") || req.headers.get("cf-connecting-ip");

    const res = await fetch(`https://ipwho.is/${ip}`);
    const data = await res.text();

    return new Response(data, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};