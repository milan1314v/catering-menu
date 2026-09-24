// functions/_middleware.js
// Cloudflare Pages middleware for Subdomain Routing, Clean URLs, 404 Fallback & Dynamic X-Robots-Tag

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.hostname || '';
  const hostname = rawHost.toLowerCase().split(':')[0].trim();

  // 0. Force canonical domain: redirect *.pages.dev and apex domain to www.catering-menu.com
  if (hostname.endsWith('.pages.dev')) {
    return Response.redirect(`https://www.catering-menu.com${url.pathname}${url.search}`, 301);
  }
  if (hostname === 'catering-menu.com') {
    return Response.redirect(`https://www.catering-menu.com${url.pathname}${url.search}`, 301);
  }

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

      // 1.1 Dynamic Subdomain Robots.txt (Points to isolated subdomain sitemap)
      if (currentPath === '/robots.txt') {
        let isIndexingEnabled = true;
        if (env && env.DB) {
          try {
            const row = await env.DB.prepare("SELECT content_json FROM site_pages WHERE page_name = 'global'").first();
            if (row) {
              const data = JSON.parse(row.content_json);
              if (data.seo_global && data.seo_global.indexing_enabled === false) isIndexingEnabled = false;
            }
          } catch (e) { }
        }
        const robotsTxt = isIndexingEnabled
          ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://${hostname}/sitemap.xml\n\n# Dynamic robots.txt managed via Catering Menu Systems`
          : `User-agent: *\nDisallow: /\n\nSitemap: https://${hostname}/sitemap.xml\n\n# Search engines temporarily paused via Admin Panel`;

        return new Response(robotsTxt, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }

      // 1.2 Dynamic Subdomain Isolated Sitemap.xml (Contains strictly this caterer's page)
      if (currentPath === '/sitemap.xml') {
        const currentDate = new Date().toISOString().split('T')[0];
        const catererXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>https://${hostname}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

        return new Response(catererXml, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }

      // If visiting root of subdomain (e.g. https://spice-route.catering-menu.com/)
      if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/index' || url.pathname === '') {
        // Verify if caterer subdomain exists in D1
        let catererExists = true;
        let catererData = null;
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
                if (s === subdomain) {
                  catererData = d;
                  return true;
                }
                return false;
              } catch (e) { return false; }
            });
          } catch (e) {
            catererExists = true; // Fallback to serve restaurant.html if DB check fails
          }
        }

        if (!catererExists) {
          // Serve branded 404 page with 404 HTTP status
          try {
            const notFoundUrl = new URL('/404.html', request.url);
            const notFoundRes = await env.ASSETS.fetch(notFoundUrl);
            if (notFoundRes && notFoundRes.ok) {
              const notFoundHtml = await notFoundRes.text();
              return new Response(notFoundHtml, {
                status: 404,
                statusText: 'Not Found',
                headers: {
                  'Content-Type': 'text/html; charset=utf-8',
                  'X-Robots-Tag': 'noindex, follow'
                }
              });
            }
          } catch (e) { }
          return new Response('Page Not Found', { status: 404 });
        }

        const rewriteUrl = new URL('/restaurant.html', request.url);
        rewriteUrl.searchParams.set('slug', subdomain);

        // Fetch the restaurant.html page internally
        let response = await env.ASSETS.fetch(rewriteUrl);
        
        // First apply the Robots headers, which wraps the response in a new mutable Response
        response = await applyRobotsHeader(response, env, request);
        
        response.headers.set('X-Debug-DB-Exists', (env && env.DB) ? 'yes' : 'no');
        response.headers.set('X-Debug-Caterer-Data', catererData ? 'found' : 'null');

        // Inject SEO Meta Tags via Cloudflare HTMLRewriter on the final mutable response
        if (catererData) {
          const defaultTitleTpl = '{name} - Catering Menu, Pricing & Reviews | Catering Menu';
          const defaultDescTpl = 'Explore {name} catering menus, event packages, photos, and verified host reviews in {location} on Catering Menu.';
          
          let seoTitle = (catererData.meta_title && catererData.meta_title.trim()) || defaultTitleTpl;
          let seoDesc = (catererData.meta_description && catererData.meta_description.trim()) || defaultDescTpl;
          
          seoTitle = seoTitle.replace(/{name}/g, catererData.name || 'Restaurant')
                             .replace(/{location}/g, catererData.location || 'your area');
          seoDesc = seoDesc.replace(/{name}/g, catererData.name || 'Restaurant')
                           .replace(/{location}/g, catererData.location || 'your area');
                           
          response.headers.set('X-Debug-Title', seoTitle);
                           
          response = new HTMLRewriter()
            .on('title', {
              element(element) {
                element.setInnerContent(seoTitle);
              }
            })
            .on('meta[name="description"]', {
              element(element) {
                element.setAttribute('content', seoDesc);
              }
            })
            .on('meta[property="og:title"]', {
              element(element) {
                element.setAttribute('content', seoTitle);
              }
            })
            .on('meta[property="og:description"]', {
              element(element) {
                element.setAttribute('content', seoDesc);
              }
            })
            .on('meta[property="og:url"]', {
              element(element) {
                element.setAttribute('content', `https://${hostname}/`);
              }
            })
            .on('meta[property="og:image"]', {
              element(element) {
                if (catererData.banner_url) element.setAttribute('content', catererData.banner_url);
              }
            })
            .on('meta[name="twitter:title"]', {
              element(element) {
                element.setAttribute('content', seoTitle);
              }
            })
            .on('meta[name="twitter:description"]', {
              element(element) {
                element.setAttribute('content', seoDesc);
              }
            })
            .on('meta[name="twitter:image"]', {
              element(element) {
                if (catererData.banner_url) element.setAttribute('content', catererData.banner_url);
              }
            })
            .transform(response);
        }

        return response;
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
      let response = await env.ASSETS.fetch(rewriteUrl);
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
      const notFoundRes = await env.ASSETS.fetch(notFoundUrl);
      if (notFoundRes && notFoundRes.ok) {
        const notFoundHtml = await notFoundRes.text();
        return new Response(notFoundHtml, {
          status: 404,
          statusText: 'Not Found',
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex, follow'
          }
        });
      }
    } catch (e) {
      console.error('Error serving branded 404 page:', e);
    }
  }

  // First apply the Robots headers to make it mutable
  response = await applyRobotsHeader(response, env, request);

  // 4. Inject Dynamic SEO Tags for Main Pages (Home, Listings, About, etc.)
  if (response.status === 200 && response.headers.get('content-type')?.includes('text/html') && env && env.DB) {
    let pageName = 'home';
    const path = url.pathname.replace(/\/$/, '') || '/';
    
    if (path.startsWith('/listings')) pageName = 'listings';
    else if (path === '/about') pageName = 'about';
    else if (path === '/contact') pageName = 'contact';
    else if (path === '/faqs') pageName = 'faqs';
    else if (path === '/get-listed') pageName = 'get-listed';
    else if (path === '/privacy') pageName = 'privacy';
    else if (path === '/terms') pageName = 'terms';

    try {
      const row = await env.DB.prepare(
        "SELECT content_json FROM site_pages WHERE page_name = ?"
      ).bind(pageName).first();

      if (row) {
        const data = JSON.parse(row.content_json);
        if (data.seo && data.seo.title) {
          const seoTitle = data.seo.title;
          const seoDesc = data.seo.description || '';
          
          response = new HTMLRewriter()
            .on('title', { element(e) { e.setInnerContent(seoTitle); } })
            .on('meta[name="description"]', { element(e) { e.setAttribute('content', seoDesc); } })
            .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', seoTitle); } })
            .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', seoDesc); } })
            .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', seoTitle); } })
            .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', seoDesc); } })
            .transform(response);
        }
      }
    } catch (e) {
      // Fail silently and serve original page if DB errors
    }
  }

  return response;
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

  const newResponse = new Response(response.body, response);
  if (!isIndexingEnabled) {
    newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  } else {
    newResponse.headers.delete('X-Robots-Tag');
  }

  return newResponse;
}
