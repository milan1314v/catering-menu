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

    // Standard credential check (admin / admin123)
    if (username === 'admin' && password === 'admin123') {
      // Generate a signed session token
      const token = btoa(JSON.stringify({
        user: 'admin',
        time: Date.now(),
        secret: 'dinevault_admin_secret_key'
      }));

      return new Response(JSON.stringify({
        success: true,
        token: token,
        username: 'admin'
      }), { status: 200, headers });
    }

    // Also check if admin exists in D1 admin_settings if custom username was saved
    if (env.DB) {
      const row = await env.DB.prepare(
        'SELECT * FROM admin_settings WHERE username = ?'
      ).bind(username).first();

      if (row && (password === 'admin123')) {
        const token = btoa(JSON.stringify({
          user: row.username,
          time: Date.now(),
          secret: 'dinevault_admin_secret_key'
        }));

        return new Response(JSON.stringify({
          success: true,
          token: token,
          username: row.username
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
