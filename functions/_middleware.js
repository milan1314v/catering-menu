// functions/_middleware.js
// Intercepts all requests and dynamically manages X-Robots-Tag based on Admin setting

export async function onRequest(context) {
  const { env, next } = context;
  const response = await next();

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
