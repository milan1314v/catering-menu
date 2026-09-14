// functions/_middleware.js
// Cloudflare Pages middleware for Subdomain Routing, Clean URLs, 404 Fallback & Dynamic X-Robots-Tag

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
      const currentPath = url.pathname.toLowerCase().replace(/\/$/, '');
      const mainPortalPages = [
        '/index', '/index.html', '/listings', '/listings.html',
        '/about', '/about.html', '/contact', '/contact.html',
        '/faqs', '/faqs.html', '/get-listed', '/get-listed.html',
        '/privacy', '/privacy.html', '/terms', '/terms.html',
        '/disclaimer', '/disclaimer.html'
      ];

      // Redirect any main portal pages requested on a subdomain to the main domain
      if (mainPortalPages.includes(currentPath)) {
        const cleanPath = currentPath.replace(/\.html$/, '').replace(/^\/index$/, '');
        const targetUrl = cleanPath ? `https://www.catering-menu.com${cleanPath}${url.search}` : `https://www.catering-menu.com/${url.search}`;
        return Response.redirect(targetUrl, 301);
      }

      // If visiting root of subdomain (e.g. https://spice-route.catering-menu.com/)
      if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/index' || url.pathname === '') {
        // Verify if caterer subdomain exists in D1
        let catererExists = true;
        if (env && env.DB) {
          try {
            const row = await env.DB.prepare(
              "SELECT id, restaurant_json FROM restaurants WHERE status = 'approved'"
            ).all();
            
            const list = (row && row.results) || [];
            catererExists = list.some(r => {
              try {
                const d = JSON.parse(r.restaurant_json);
                const s = d.slug || (d.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
                return s === subdomain;
              } catch(e) { return false; }
            });
          } catch(e) {
            catererExists = true; // Fallback to serve restaurant.html if DB check fails
          }
        }

        if (!catererExists) {
          // Serve branded 404 page with 404 HTTP status
          const notFoundUrl = new URL('/404.html', request.url);
          const notFoundRes = await env.ASSETS.fetch(new Request(notFoundUrl, request));
          return new Response(notFoundRes.body, {
            status: 404,
            statusText: 'Not Found',
            headers: notFoundRes.headers
          });
        }

        const rewriteUrl = new URL('/restaurant.html', request.url);
        rewriteUrl.searchParams.set('slug', subdomain);

        // Fetch the restaurant.html page internally
        let response = await env.ASSETS.fetch(new Request(rewriteUrl, request));
        return applyRobotsHeader(response, env, request);
      }
    }
  }

  // 1.5. Clean URL redirect for /index or /index.html on main domain
  if (url.pathname === '/index' || url.pathname === '/index.html') {
    url.pathname = '/';
    return Response.redirect(url.toString(), 301);
  }

  // 1.6. Clean URL rewrite for /listings/* (e.g. /listings/asian -> /listings.html?q=asian)
  if (url.pathname.startsWith('/listings/') && !url.pathname.includes('.')) {
    const rawCategory = url.pathname.replace(/^\/listings\//, '').replace(/\/$/, '');
    if (rawCategory) {
      const rewriteUrl = new URL('/listings.html', request.url);
      rewriteUrl.searchParams.set('q', decodeURIComponent(rawCategory));
      let response = await env.ASSETS.fetch(new Request(rewriteUrl, request));
      return applyRobotsHeader(response, env, request);
    }
  }

  // 1.7. Clean redirect: convert /listings?q=asian into clean URL /listings/asian
  if ((url.pathname === '/listings' || url.pathname === '/listings.html') && url.searchParams.has('q')) {
    const qVal = (url.searchParams.get('q') || '').trim();
    if (qVal && !url.searchParams.get('page')) {
      const cleanPath = `/listings/${encodeURIComponent(qVal.toLowerCase())}`;
      return Response.redirect(`https://${url.host}${cleanPath}`, 301);
    }
  }

  // 2. Normal Request
  let response = await next();

  // 3. Branded 404 fallback for non-existent static routes
  if (response.status === 404 && !url.pathname.startsWith('/api/')) {
    try {
      const notFoundUrl = new URL('/404.html', request.url);
      const notFoundRes = await env.ASSETS.fetch(new Request(notFoundUrl, request));
      return new Response(notFoundRes.body, {
        status: 404,
        statusText: 'Not Found',
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex, follow'
        }
      });
    } catch(e) {}
  }

  return applyRobotsHeader(response, env, request);
}

async function applyRobotsHeader(response, env, request) {
  const url = new URL(request.url);
  const path = url.pathname.toLowerCase();

  // Always protect admin and internal api from search indexing
  if (path.startsWith('/admin') || path.startsWith('/api')) {
    const adminResponse = new Response(response.body, response);
    adminResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return adminResponse;
  }

  let isIndexingEnabled = false; // Default: Blocked until client approval
 
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
    } catch (e) {
      isIndexingEnabled = false;
    }
  }

  const newResponse = new Response(response.body, response);
  if (!isIndexingEnabled) {
    newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  } else {
    newResponse.headers.delete('X-Robots-Tag');
  }

  return newResponse;
}
