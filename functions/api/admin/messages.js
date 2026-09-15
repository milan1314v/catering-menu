// functions/api/admin/messages.js
// Admin Contact Messages & Inquiries Management for Cloudflare D1

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database binding not configured' }), { status: 500, headers });
  }

  // Auth check
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Admin session required.' }), { status: 401, headers });
  }

  // Ensure table columns (status, phone) exist via safe migrations
  try {
    await env.DB.prepare("ALTER TABLE contact_submissions ADD COLUMN status TEXT DEFAULT 'unread'").run();
  } catch (e) {
    // Column already exists
  }
  try {
    await env.DB.prepare("ALTER TABLE contact_submissions ADD COLUMN phone TEXT DEFAULT ''").run();
  } catch (e) {
    // Column already exists
  }

  try {
    // ═══════════════════════════════════════════════════════
    // GET: List all messages with stats
    // ═══════════════════════════════════════════════════════
    if (method === 'GET') {
      const url = new URL(request.url);
      const statusFilter = url.searchParams.get('status');

      let query = 'SELECT id, name, email, COALESCE(phone, "") as phone, subject, message, COALESCE(status, "unread") as status, submitted_at FROM contact_submissions';
      let params = [];

      if (statusFilter && statusFilter !== 'all') {
        query += ' WHERE status = ?';
        params.push(statusFilter);
      }

      query += ' ORDER BY id DESC';

      let stmt = env.DB.prepare(query);
      if (params.length > 0) {
        stmt = stmt.bind(...params);
      }

      const { results } = await stmt.all();

      // Compute status counters
      const allRows = await env.DB.prepare(
        'SELECT COALESCE(status, "unread") as status, COUNT(*) as count FROM contact_submissions GROUP BY status'
      ).all().catch(() => ({ results: [] }));

      let total = 0;
      let unread = 0;
      let read = 0;
      let replied = 0;

      (allRows.results || []).forEach(r => {
        const c = r.count || 0;
        total += c;
        if (r.status === 'unread') unread += c;
        else if (r.status === 'read') read += c;
        else if (r.status === 'replied') replied += c;
      });

      return new Response(JSON.stringify({
        success: true,
        stats: { total, unread, read, replied },
        messages: results || []
      }), { status: 200, headers });
    }

    // ═══════════════════════════════════════════════════════
    // POST: Manage messages (status, delete, mark read)
    // ═══════════════════════════════════════════════════════
    if (method === 'POST') {
      const body = await request.json();
      const { action, id, ids, status } = body;

      // 1. Update single message status
      if (action === 'set_status') {
        if (!id || !status) {
          return new Response(JSON.stringify({ error: 'Missing id or status parameter' }), { status: 400, headers });
        }
        await env.DB.prepare(
          'UPDATE contact_submissions SET status = ? WHERE id = ?'
        ).bind(status, id).run();

        return new Response(JSON.stringify({ success: true, message: `Message #${id} marked as ${status}` }), { status: 200, headers });
      }

      // 2. Mark all as read
      if (action === 'mark_all_read') {
        await env.DB.prepare(
          "UPDATE contact_submissions SET status = 'read' WHERE status = 'unread' OR status IS NULL"
        ).run();

        return new Response(JSON.stringify({ success: true, message: 'All unread messages marked as read.' }), { status: 200, headers });
      }

      // 3. Delete single message
      if (action === 'delete') {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing id parameter' }), { status: 400, headers });
        }
        await env.DB.prepare('DELETE FROM contact_submissions WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true, message: `Message #${id} deleted.` }), { status: 200, headers });
      }

      // 4. Batch delete messages
      if (action === 'delete_multiple') {
        if (!Array.isArray(ids) || ids.length === 0) {
          return new Response(JSON.stringify({ error: 'ids array is required for batch delete' }), { status: 400, headers });
        }
        const placeholders = ids.map(() => '?').join(',');
        await env.DB.prepare(`DELETE FROM contact_submissions WHERE id IN (${placeholders})`).bind(...ids).run();
        return new Response(JSON.stringify({ success: true, message: `${ids.length} messages deleted.` }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
