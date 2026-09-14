// functions/api/content.js
// Returns merged global + page content from Cloudflare D1

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pageName = url.searchParams.get('page') || 'home';

  // Default headers with JSON content type and CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache, must-revalidate'
  };

  if (!env.DB) {
    return new Response(JSON.stringify({ 
      error: 'D1 Database binding DB not found. Please bind your D1 database in Cloudflare Pages settings.' 
    }), { status: 500, headers });
  }

  try {
    // 1. Fetch Global Content
    const globalRow = await env.DB.prepare(
      'SELECT content_json FROM site_pages WHERE page_name = ?'
    ).bind('global').first();

    const globalData = globalRow ? JSON.parse(globalRow.content_json) : {};

    // 2. Fetch Specific Page Content
    let pageData = {};
    if (pageName !== 'global') {
      const pageRow = await env.DB.prepare(
        'SELECT content_json FROM site_pages WHERE page_name = ?'
      ).bind(pageName).first();

      if (pageRow) {
        pageData = JSON.parse(pageRow.content_json);
      }
    }

    // Merge global and page data (unless raw=true is requested for Admin CMS)
    const raw = url.searchParams.get('raw') === 'true';
    const responseData = raw ? (pageName === 'global' ? globalData : pageData) : { ...globalData, ...pageData };

    return new Response(JSON.stringify(responseData), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
