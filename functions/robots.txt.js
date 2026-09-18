// functions/robots.txt.js
// Dynamically generates robots.txt from Cloudflare D1 settings

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();

  // Determine dynamic sitemap URL based on hostname
  let sitemapUrl = 'https://www.catering-menu.com/sitemap.xml';
  const parts = hostname.split('.');

  // If requested on a caterer subdomain (e.g. panera-bread.catering-menu.com)
  const isCateringDomain = hostname.endsWith('catering-menu.com');
  const isSubdomain = (isCateringDomain && parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'admin' && parts[0] !== 'api')
    || (!isCateringDomain && parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'admin' && parts[0] !== 'api');

  if (isSubdomain) {
    sitemapUrl = `https://${hostname}/sitemap.xml`;
  }

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

Sitemap: ${sitemapUrl}

# Dynamic robots.txt managed via Catering Menu Systems`
    : `User-agent: *
Disallow: /

Sitemap: ${sitemapUrl}

# Search engines temporarily paused via Admin Panel`;

  return new Response(robotsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    }
  });
}
