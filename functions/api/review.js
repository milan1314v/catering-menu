// functions/api/review.js
// Adds a customer review to a restaurant in Cloudflare D1

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
    let body;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    }

    const { restaurant_id, name, rating, text } = body;

    if (!restaurant_id || !name || !rating || !text) {
      return new Response(JSON.stringify({ error: 'Restaurant ID, name, rating, and review text are required.' }), { status: 400, headers });
    }

    const row = await env.DB.prepare(
      'SELECT id, status, restaurant_json FROM restaurants WHERE id = ?'
    ).bind(restaurant_id).first();

    if (!row) {
      return new Response(JSON.stringify({ error: 'Restaurant not found' }), { status: 404, headers });
    }

    const restaurant = JSON.parse(row.restaurant_json);
    if (!Array.isArray(restaurant.reviews)) {
      restaurant.reviews = [];
    }

    const newReview = {
      name: name.trim(),
      rating: parseInt(rating, 10) || 5,
      date: new Date().toISOString().split('T')[0],
      text: text.trim()
    };

    // Prepend new review
    restaurant.reviews.unshift(newReview);

    await env.DB.prepare(
      'UPDATE restaurants SET restaurant_json = ? WHERE id = ?'
    ).bind(JSON.stringify(restaurant), restaurant_id).run();

    return new Response(JSON.stringify({ success: true, message: 'Review added successfully!', review: newReview }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
