// functions/api/restaurant/[id].js
// Fetches single restaurant by ID from Cloudflare D1

export async function onRequestGet(context) {
  const { params, env } = context;
  const id = params.id;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60, s-maxage=120'
  };

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database binding not configured' }), { status: 500, headers });
  }

  try {
    const row = await env.DB.prepare(
      'SELECT id, status, restaurant_json FROM restaurants WHERE id = ?'
    ).bind(id).first();

    if (!row) {
      return new Response(JSON.stringify({ error: 'Restaurant not found' }), { status: 404, headers });
    }

    const data = JSON.parse(row.restaurant_json);
    data.id = row.id;
    data.status = row.status;

    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
