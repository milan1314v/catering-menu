// functions/robots.txt.js
// Dynamically generates robots.txt from Cloudflare D1 settings

export async function onRequestGet(context) {
  const { env } = context;

  let isIndexingEnabled = true; // Default: Live indexing enabled (index, follow)

  if (env && env.DB) {
    try {
      const row = await env.DB.prepare(
        "SELECT content_json FROM site_pages WHERE page_name = 'global'"
      ).first();

      if (row) {
        const data = JSON.parse(row.content_json);
        if (data.seo_global && data.seo_global.indexing_enabled === false) {
          isIndexingEnabled = false;
        }
      }
    } catch (e) {
      isIndexingEnabled = true;
    }
  }

  const robotsContent = isIndexingEnabled
    ? `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://www.catering-menu.com/sitemap.xml

# Dynamic robots.txt managed via Catering Menu Systems`
    : `User-agent: *
Disallow: /

Sitemap: https://www.catering-menu.com/sitemap.xml

# Search engines temporarily paused via Admin Panel`;

  return new Response(robotsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    }
  });
}
