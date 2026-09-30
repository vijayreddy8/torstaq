# TorStaq website — setup

Files: index.html, services.html, erpnext-devops.html, styles.css, api/contact.js

## Make the contact form deliver to your inbox (one-time, ~5 min)
1. Create a free account at https://resend.com using **hellotorstaq@gmail.com** and create an API key.
2. Vercel → your project → Settings → Environment Variables → add:
   - `RESEND_API_KEY` = your key  (required)
   - `CONTACT_TO` = hellotorstaq@gmail.com  (optional, default already this)
   - `CONTACT_FROM` = `TorStaq <hello@yourdomain.com>` (optional; needs a domain verified in Resend.
     Until then the default sender works, but Resend only delivers to your own Resend account email.)
3. Redeploy. Test the form. If the API fails, the form falls back to opening the visitor's email app.

## Deploy
Copy all files into your repo root (keep the `api` folder), commit, push. Vercel redeploys automatically.
