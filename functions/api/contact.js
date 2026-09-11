// functions/api/contact.js
// Handles contact form submissions into Cloudflare D1

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

    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Name, email, and message are required.' }), { status: 400, headers });
    }

    await env.DB.prepare(
      'INSERT INTO contact_submissions (name, email, subject, message) VALUES (?, ?, ?, ?)'
    ).bind(
      name.trim(),
      email.trim(),
      (subject || 'General Inquiry').trim(),
      message.trim()
    ).run();

    return new Response(JSON.stringify({ success: true, message: 'Message submitted successfully!' }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
