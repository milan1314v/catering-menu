// functions/api/admin/stats.js
// Returns dashboard metrics and recent inquiries for Cloudflare D1

export async function onRequestGet(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database binding not configured' }), { status: 500, headers });
  }

  try {
    // 1. Total restaurants count
    const totalRest = await env.DB.prepare('SELECT COUNT(*) as c FROM restaurants').first('c') || 0;

    // 2. Approved restaurants count
    const approvedRest = await env.DB.prepare("SELECT COUNT(*) as c FROM restaurants WHERE status = 'approved'").first('c') || 0;

    // 3. Pending restaurants count
    const pendingRest = await env.DB.prepare("SELECT COUNT(*) as c FROM restaurants WHERE status = 'pending'").first('c') || 0;

    // 4. Contact submissions count
    const totalContacts = await env.DB.prepare('SELECT COUNT(*) as c FROM contact_submissions').first('c') || 0;

    // 5. Recent restaurants
    const { results: recentRestaurants } = await env.DB.prepare(
      'SELECT id, status, restaurant_json FROM restaurants ORDER BY id DESC LIMIT 5'
    ).all();

    const formattedRecent = (recentRestaurants || []).map(r => {
      try {
        const d = JSON.parse(r.restaurant_json);
        return { id: r.id, status: r.status, name: d.name, cuisine: d.cuisine, price_range: d.price_range };
      } catch (e) {
        return { id: r.id, status: r.status };
      }
    });

    // 6. Recent contacts
    const { results: recentContacts } = await env.DB.prepare(
      'SELECT * FROM contact_submissions ORDER BY id DESC LIMIT 5'
    ).all();

    return new Response(JSON.stringify({
      stats: {
        total_restaurants: totalRest,
        approved_restaurants: approvedRest,
        pending_restaurants: pendingRest,
        total_contacts: totalContacts
      },
      recent_restaurants: formattedRecent,
      recent_contacts: recentContacts || []
    }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
