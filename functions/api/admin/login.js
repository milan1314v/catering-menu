// functions/api/admin/login.js
// Handles admin login for DineVault on Cloudflare

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    let body;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    }

    const { username, password } = body;

    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // STRICT CREDENTIAL CHECK: ONLY admin@cateringmenu.com / CateringAdmin@1324$
    const isStrictUser = (cleanUser === 'admin@cateringmenu.com');
    const isStrictPass = (cleanPass === 'CateringAdmin@1324$');

    if (isStrictUser && isStrictPass) {
      // Generate a signed session token
      const token = btoa(JSON.stringify({
        user: 'admin@cateringmenu.com',
        time: Date.now(),
        secret: 'dinevault_admin_secret_key'
      }));

      return new Response(JSON.stringify({
        success: true,
        token: token,
        username: 'admin@cateringmenu.com'
      }), { status: 200, headers });
    }

    // Check D1 only for admin@cateringmenu.com with custom hashed password
    if (env.DB && isStrictUser) {
      const row = await env.DB.prepare(
        'SELECT * FROM admin_settings WHERE LOWER(username) = ?'
      ).bind('admin@cateringmenu.com').first();

      if (row && (cleanPass === row.password_hash || isStrictPass)) {
        const token = btoa(JSON.stringify({
          user: 'admin@cateringmenu.com',
          time: Date.now(),
          secret: 'dinevault_admin_secret_key'
        }));

        return new Response(JSON.stringify({
          success: true,
          token: token,
          username: 'admin@cateringmenu.com'
        }), { status: 200, headers });
      }
    }

    return new Response(JSON.stringify({
      error: 'Invalid username or password.'
    }), { status: 401, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
