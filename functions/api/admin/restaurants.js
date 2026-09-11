// functions/api/admin/restaurants.js
// Admin restaurant management for Cloudflare D1

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database binding not configured' }), { status: 500, headers });
  }

  // Auth check for state-modifying requests
  if (method !== 'GET') {
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }
  }

  try {
    // GET ALL RESTAURANTS (any status)
    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, status, restaurant_json FROM restaurants ORDER BY id DESC'
      ).all();

      const items = (results || []).map(row => {
        try {
          const data = JSON.parse(row.restaurant_json);
          return { id: row.id, status: row.status, ...data };
        } catch (e) {
          return { id: row.id, status: row.status };
        }
      });

      return new Response(JSON.stringify(items), { status: 200, headers });
    }

    // POST: Create or Perform Specific Action
    if (method === 'POST') {
      const body = await request.json();
      const action = body.action || 'create';

      // Approve or Reject status change
      if (action === 'set_status') {
        const { id, status } = body;
        await env.DB.prepare(
          'UPDATE restaurants SET status = ? WHERE id = ?'
        ).bind(status, id).run();

        return new Response(JSON.stringify({ success: true, message: `Status updated to ${status}` }), { status: 200, headers });
      }

      // Delete a single review from a restaurant
      if (action === 'delete_review') {
        const { id, review_index } = body;
        const row = await env.DB.prepare(
          'SELECT restaurant_json FROM restaurants WHERE id = ?'
        ).bind(id).first();

        if (row) {
          const data = JSON.parse(row.restaurant_json);
          if (Array.isArray(data.reviews)) {
            data.reviews.splice(review_index, 1);
            await env.DB.prepare(
              'UPDATE restaurants SET restaurant_json = ? WHERE id = ?'
            ).bind(JSON.stringify(data), id).run();
          }
        }
        return new Response(JSON.stringify({ success: true, message: 'Review deleted' }), { status: 200, headers });
      }

      // Add review from admin
      if (action === 'add_review') {
        const { id, name, rating, text, date } = body;
        const row = await env.DB.prepare(
          'SELECT restaurant_json FROM restaurants WHERE id = ?'
        ).bind(id).first();

        if (row) {
          const data = JSON.parse(row.restaurant_json);
          if (!Array.isArray(data.reviews)) data.reviews = [];
          data.reviews.unshift({
            name: name || 'Anonymous',
            rating: parseInt(rating, 10) || 5,
            date: date || new Date().toISOString().split('T')[0],
            text: text || ''
          });
          await env.DB.prepare(
            'UPDATE restaurants SET restaurant_json = ? WHERE id = ?'
          ).bind(JSON.stringify(data), id).run();
        }
        return new Response(JSON.stringify({ success: true, message: 'Review added' }), { status: 200, headers });
      }

      // Update full restaurant details
      if (action === 'update_restaurant') {
        const { id, restaurant_data, status } = body;
        await env.DB.prepare(
          'UPDATE restaurants SET restaurant_json = ?, status = ? WHERE id = ?'
        ).bind(
          typeof restaurant_data === 'string' ? restaurant_data : JSON.stringify(restaurant_data),
          status || 'approved',
          id
        ).run();

        return new Response(JSON.stringify({ success: true, message: 'Restaurant updated successfully' }), { status: 200, headers });
      }

      // Delete restaurant
      if (action === 'delete') {
        const { id } = body;
        await env.DB.prepare('DELETE FROM restaurants WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true, message: 'Restaurant deleted' }), { status: 200, headers });
      }
    }

    return new Response(JSON.stringify({ error: 'Method not supported' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
