// functions/api/admin/content.js
// Handles updating page content JSON in Cloudflare D1

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database binding not configured' }), { status: 500, headers });
  }

  try {
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Please login again.' }), { status: 401, headers });
    }

    const body = await request.json();
    const { page_name, content_json } = body;

    if (!page_name || !content_json) {
      return new Response(JSON.stringify({ error: 'Page name and content_json are required.' }), { status: 400, headers });
    }

    // Ensure valid JSON format
    let validJsonString = typeof content_json === 'string' ? content_json : JSON.stringify(content_json);
    JSON.parse(validJsonString); // Will throw if invalid JSON

    await env.DB.prepare(
      'INSERT INTO site_pages (page_name, content_json) VALUES (?, ?) ON CONFLICT(page_name) DO UPDATE SET content_json = excluded.content_json'
    ).bind(page_name, validJsonString).run();

    return new Response(JSON.stringify({ success: true, message: `Page '${page_name}' updated successfully!` }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
