// functions/robots.txt.js
// Dynamically generates robots.txt from Cloudflare D1 settings

export async function onRequestGet(context) {
  const { env } = context;

  let isIndexingEnabled = false;

  if (env.DB) {
    try {
      const row = await env.DB.prepare(
        "SELECT content_json FROM site_pages WHERE page_name = 'global'"
      ).first();

      if (row) {
        const data = JSON.parse(row.content_json);
        if (data.seo_global && data.seo_global.indexing_enabled === true) {
          isIndexingEnabled = true;
        }
      }
    } catch (e) {
      isIndexingEnabled = false;
    }
  }

  const robotsContent = isIndexingEnabled
    ? "User-agent: *\nAllow: /\n\n# Dynamic robots.txt managed via Admin Panel"
    : "User-agent: *\nDisallow: /\n\n# Search engines blocked via Admin Panel";

  return new Response(robotsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60"
    }
  });
}
