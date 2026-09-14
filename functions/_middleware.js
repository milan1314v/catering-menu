// functions/_middleware.js
// Cloudflare Pages middleware for Subdomain Routing & Dynamic X-Robots-Tag

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();

  // 1. Caterer Subdomain Routing (e.g. spice-route.catering-menu.com)
  const isCateringDomain = hostname.endsWith('catering-menu.com');
  const parts = hostname.split('.');

  if (isCateringDomain && parts.length > 2) {
    const subdomain = parts[0];
    // Ignore main domains, reserved subdomains, and api/admin
    if (subdomain !== 'www' && subdomain !== 'admin' && subdomain !== 'api') {
      // If visiting root of subdomain (e.g. https://spice-route.catering-menu.com/)
      if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '') {
        const rewriteUrl = new URL('/restaurant.html', request.url);
        rewriteUrl.searchParams.set('slug', subdomain);

        // Fetch the restaurant.html page internally
        let response = await env.ASSETS.fetch(new Request(rewriteUrl, request));
        return applyRobotsHeader(response, env);
      }
    }
  }

  // 2. Normal Request
  const response = await next();
  return applyRobotsHeader(response, env);
}

async function applyRobotsHeader(response, env) {
  let isIndexingEnabled = false;

  if (env && env.DB) {
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
    } catch (e) {}
  }

  const newResponse = new Response(response.body, response);
  if (!isIndexingEnabled) {
    newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  } else {
    newResponse.headers.delete('X-Robots-Tag');
  }

  return newResponse;
}
