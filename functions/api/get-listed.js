// functions/api/get-listed.js
// Handles new restaurant submissions into Cloudflare D1 with status 'pending'

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

    const {
      name,
      cuisine,
      price_range,
      banner_url,
      gallery_images,
      menu_images,
      about_text,
      direct_menu_text,
      opening_hours,
      opening_days,
      locations,
      lat,
      lng
    } = body;

    if (!name || !about_text) {
      return new Response(JSON.stringify({ error: 'Restaurant name and description are required.' }), { status: 400, headers });
    }

    function slugify(text) {
      if (!text) return '';
      return text.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }

    // Unify gallery images
    let finalGallery = [];
    if (Array.isArray(menu_images) && menu_images.length > 0) {
      finalGallery = menu_images;
    } else if (Array.isArray(gallery_images) && gallery_images.length > 0) {
      finalGallery = gallery_images;
    }

    const restaurantObj = {
      name: name.trim(),
      slug: slugify(name),
      cuisine: (cuisine || 'International').trim(),
      price_range: (price_range || '$$').trim(),
      lat: lat ? parseFloat(lat) : 40.7128,
      lng: lng ? parseFloat(lng) : -74.0060,
      banner_url: (banner_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400').trim(),
      menu_images: finalGallery,
      about_text: about_text.trim(),
      direct_menu_text: (direct_menu_text || '').trim(),
      menu_file_path: '',
      opening_hours: opening_hours || null,
      opening_days: (opening_days || 'Mon-Sun: 11:00 AM - 10:00 PM').trim(),
      locations: (locations || '').trim(),
      reviews: []
    };

    await env.DB.prepare(
      'INSERT INTO restaurants (status, restaurant_json) VALUES (?, ?)'
    ).bind('pending', JSON.stringify(restaurantObj)).run();

    return new Response(JSON.stringify({ success: true, message: 'Restaurant submitted successfully for review!' }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
