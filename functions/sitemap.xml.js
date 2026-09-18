// functions/sitemap.xml.js
// Dynamically generates sitemap.xml with Core Pages, Category Listings & Caterer Subdomains

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.hostname || '';
  const hostname = rawHost.toLowerCase().split(':')[0].trim();
  const currentDate = new Date().toISOString().split('T')[0];
  const parts = hostname.split('.');

  // If request is on a caterer subdomain (e.g. panera-bread.catering-menu.com)
  const isCateringDomain = hostname.endsWith('catering-menu.com');
  const isSubdomain = (isCateringDomain && parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'admin' && parts[0] !== 'api')
    || (!isCateringDomain && parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'admin' && parts[0] !== 'api');

  if (isSubdomain) {
    // Return isolated sitemap containing strictly this caterer's page
    const catererSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
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

    return new Response(catererSitemapXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }

  // Otherwise, generate main domain sitemap
  const baseUrl = 'https://www.catering-menu.com';

  // 1. Core Static Pages
  const staticPages = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/listings`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/get-listed`, priority: '0.85', changefreq: 'monthly' },
    { loc: `${baseUrl}/about`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${baseUrl}/faqs`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${baseUrl}/contact`, priority: '0.6', changefreq: 'monthly' },
    { loc: `${baseUrl}/privacy`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${baseUrl}/terms`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${baseUrl}/disclaimer`, priority: '0.3', changefreq: 'yearly' }
  ];

  // 2. High-Intent Category & Service URLs
  const categoryKeywords = [
    'wedding', 'corporate', 'buffet', 'party', 'live',
    'french', 'japanese', 'american', 'italian', 'indian', 'asian', 'bbq'
  ];

  const categoryPages = categoryKeywords.map(cat => ({
    loc: `${baseUrl}/listings/${cat}`,
    priority: '0.8',
    changefreq: 'weekly'
  }));

  // 3. Dynamic Caterer Subdomains from Cloudflare D1
  const catererPages = [];
  if (env && env.DB) {
    try {
      const { results } = await env.DB.prepare(
        "SELECT id, restaurant_json FROM restaurants WHERE status = 'approved' ORDER BY id DESC"
      ).all();

      function slugify(text) {
        if (!text) return '';
        return text.toString().toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
      }

      (results || []).forEach(row => {
        try {
          const data = JSON.parse(row.restaurant_json);
          const slug = (data.slug || slugify(data.name || '')).trim();
          if (slug) {
            catererPages.push({
              loc: `https://${slug}.catering-menu.com/`,
              priority: '0.85',
              changefreq: 'weekly'
            });
          }
        } catch(e) {}
      });
    } catch(e) {
      console.error('Error fetching caterers for sitemap', e);
    }
  }

  // Fallback default caterers if database returns empty
  if (catererPages.length === 0) {
    const defaultSlugs = ['la-maison-doree', 'sakura-japanese-kitchen', 'the-copper-grill', 'verde-trattoria', 'spice-route'];
    defaultSlugs.forEach(slug => {
      catererPages.push({
        loc: `https://${slug}.catering-menu.com/`,
        priority: '0.85',
        changefreq: 'weekly'
      });
    });
  }

  const allUrls = [...staticPages, ...categoryPages, ...catererPages];

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xmlContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
