// Vercel Serverless Function: POST /api/contact
// Sends the enquiry to your inbox through Resend (https://resend.com).
const PACKAGES = ['Not sure yet', 'Starter Website', 'Business Website', 'Web + Cloud', 'TorStaq Care'];
const hits = new Map(); // best-effort per-instance rate limit

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b); } catch { return res.status(400).json({ error: 'Invalid request' }); }
  b = b || {};

  if (b.website) return res.status(200).json({ ok: true }); // honeypot: bots fill this

  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  hits.set(ip, [...recent, now]);

  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const message = String(b.message || '').trim();
  const pkg = PACKAGES.includes(b.package) ? b.package : 'Not sure yet';
  const budget = String(b.budget || '').slice(0, 40);

  if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Please enter your name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (message.length < 10 || message.length > 3000) return res.status(400).json({ error: 'Please add a few more details.' });

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'Email service is not configured.' });

  const html = `<h2>New TorStaq enquiry</h2><p><b>Name:</b> ${esc(name)}<br><b>Email:</b> ${esc(email)}<br><b>Package:</b> ${esc(pkg)}<br><b>Budget:</b> ${esc(budget)}</p><p style="white-space:pre-wrap">${esc(message)}</p>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || 'TorStaq Website <onboarding@resend.dev>',
        to: [process.env.CONTACT_TO || 'hellotorstaq@gmail.com'],
        reply_to: email,
        subject: `New enquiry: ${pkg} — ${name}`.slice(0, 150),
        html,
        text: `Name: ${name}\nEmail: ${email}\nPackage: ${pkg}\nBudget: ${budget}\n\n${message}`,
      }),
    });
    if (!r.ok) {
      let detail = 'Resend rejected the email request.';
      try {
        const body = await r.json();
        detail = body?.message || body?.name || detail;
      } catch {}
      return res.status(502).json({ error: detail });
    }
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'Could not send message.' });
  }
};
