// functions/api/restaurants.js
// Returns list of restaurants from Cloudflare D1

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'approved';
  const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit'), 10) : null;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60, s-maxage=120'
  };

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database binding not configured' }), { status: 500, headers });
  }

  try {
    let query = 'SELECT id, status, restaurant_json FROM restaurants';
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY id DESC';

    if (limit && limit > 0) {
      query += ` LIMIT ${limit}`;
    }

    let stmt = env.DB.prepare(query);
    if (params.length > 0) {
      stmt = stmt.bind(...params);
    }

    const { results } = await stmt.all();

    const restaurants = (results || []).map(row => {
      try {
        const data = JSON.parse(row.restaurant_json);
        return {
          id: row.id,
          status: row.status,
          ...data
        };
      } catch (e) {
        return { id: row.id, status: row.status };
      }
    });

    return new Response(JSON.stringify(restaurants), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
