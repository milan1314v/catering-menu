// functions/api/restaurant/[id].js
// Fetches single restaurant by ID from Cloudflare D1

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function onRequestGet(context) {
  const { params, env } = context;
  const identifier = decodeURIComponent(params.id || '').trim();

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60, s-maxage=120'
  };

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database binding not configured' }), { status: 500, headers });
  }

  try {
    let row = null;

    // 1. If numeric, try querying by primary key ID
    if (/^\d+$/.test(identifier)) {
      row = await env.DB.prepare(
        'SELECT id, status, restaurant_json FROM restaurants WHERE id = ?'
      ).bind(identifier).first();
    }

    // 2. If not found or identifier is a slug, search in restaurants
    if (!row) {
      const { results } = await env.DB.prepare(
        'SELECT id, status, restaurant_json FROM restaurants WHERE status = "approved"'
      ).all();

      const targetSlug = identifier.toLowerCase();
      for (const item of (results || [])) {
        try {
          const data = JSON.parse(item.restaurant_json);
          const itemSlug = (data.slug || slugify(data.name || '')).toLowerCase();
          if (itemSlug === targetSlug || String(item.id) === targetSlug) {
            row = item;
            break;
          }
        } catch (e) {}
      }
    }

    if (!row) {
      return new Response(JSON.stringify({ error: 'Caterer not found' }), { status: 404, headers });
    }

    const data = JSON.parse(row.restaurant_json);
    data.id = row.id;
    data.status = row.status;
    data.slug = data.slug || slugify(data.name || '');

    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
