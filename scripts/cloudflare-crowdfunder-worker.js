// Environment Variables:
// ALLOWED_ORIGINS - Comma-separated list of allowed origins
// BRIGHTDATA_API_KEY - BrightData API key
// CROWDFUNDER_URL - Crowdfunder URL
// BACKUP_AMOUNT - Backup amount to use if Brightdata API fails to parse the Crowdfunder HTML

// Workers KV:
// LAST_KNOWN_AMOUNT - Last known amount from Brightdata API

export default {
  async fetch(request, env, ctx) {
    const allowedOrigins = env.ALLOWED_ORIGINS.split(",");
    const origin = request.headers.get("Origin");
    const corsOrigin = origin && allowedOrigins.includes(origin)
      ? origin
      : null;
    
    if (!corsOrigin) {
      return new Response("Forbidden", {
        status: 403
      });
    }
  
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsOrigin
          ? {
              "Access-Control-Allow-Origin": corsOrigin
            }
          : {}
      });
    }

    const applyCors = (response) => {
      if (corsOrigin) {
        response.headers.set("Access-Control-Allow-Origin", corsOrigin);
      }

      return response;
    };

    const jsonResponse = (data, headers) => {
      const response = new Response(
        JSON.stringify(data),
        {
          headers: {
            "Content-Type": "application/json",
            ...(headers || {})
          }
        }
      );

      return applyCors(response);
    };

    const cache = caches.default;
    const cacheKey = "https://cache.internal/crowdfunder/safety-netting/amount";

    try {
      // Check the Cloudflare cache first
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return applyCors(new Response(cachedResponse.body, cachedResponse));
      }

      const brightDataResponse = await fetch("https://api.brightdata.com/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.BRIGHTDATA_API_KEY}`
          },
          body: JSON.stringify({
            zone: "crowdfunder",
            url: env.CROWDFUNDER_URL,
            format: "raw",
            render: false
          })
        }
      );

      if (!brightDataResponse.ok) {
        throw new Error(`Bright Data error: ${brightDataResponse.status}`);
      }

      const html = await brightDataResponse.text();
      const match = html.match(/data-project=["']progress-amount["'][\s\S]*?<h3[^>]*>\s*([^<]+?)\s*<\/h3>/i);

      if (!match) {
        console.log("Donation amount not found");
        console.log("HTML length:", html.length);
        console.log("HTML start:", html.substring(0, 2000));
        throw new Error("Donation amount not found");
      }

      const amount = match[1].trim();
      if (!/^£[\d,]+(?:\.\d{2})?$/.test(amount)) {
        throw new Error("Invalid donation amount");
      }

      const cleanAmount = amount.replace(/[£,]/g, "");

      const response = jsonResponse(
        { success: true, amount: cleanAmount, updated: new Date().toISOString()},
        { "Cache-Control": "public, max-age=1800" } // 30mins
      );

      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      ctx.waitUntil(env.LAST_KNOWN_AMOUNT.put("amount", cleanAmount));

      return response;
    } catch (error) {
      console.log("Bright Data failed:", error.message);

      const lastKnownAmount = await env.LAST_KNOWN_AMOUNT.get("amount");

      return jsonResponse(
        { success: true, amount: lastKnownAmount || env.BACKUP_AMOUNT, updated: new Date().toISOString() },
        { }
      );
    }
  }
};