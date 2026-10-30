/**
 * Aspire Removals proxy for Netlify Functions.
 * Required Netlify environment variables:
 *   REMOVALS_SCRIPT_URL = deployed Apps Script Web App URL ending in /exec
 *   REMOVALS_TOKEN      = the same private token configured in Removals_Workspace.gs
 */
exports.handler = async function (event) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
  if (event.httpMethod !== 'POST') return reply(405, { ok: false, error: 'Method not allowed' });

  const scriptUrl = (process.env.REMOVALS_SCRIPT_URL || '').trim();
  const token = (process.env.REMOVALS_TOKEN || '').trim();
  if (!scriptUrl || !token) {
    return reply(500, { ok: false, error: 'Netlify is missing REMOVALS_SCRIPT_URL or REMOVALS_TOKEN. Add both environment variables and redeploy.' });
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(scriptUrl)) {
    return reply(500, { ok: false, error: 'REMOVALS_SCRIPT_URL must be the deployed Google Apps Script Web App URL ending in /exec.' });
  }

  let input;
  try { input = JSON.parse(event.body || '{}'); }
  catch (_) { return reply(400, { ok: false, error: 'Invalid JSON request from Aspire.' }); }

  const action = String(input.action || 'list');
  try {
    let upstream;
    if (action === 'list') {
      const url = new URL(scriptUrl);
      url.searchParams.set('action', 'list');
      url.searchParams.set('token', token);
      url.searchParams.set('_', String(Date.now()));
      upstream = await fetch(url.toString(), { method: 'GET', redirect: 'follow', headers: { 'Accept': 'application/json' } });
    } else if (['create', 'update', 'archive'].includes(action)) {
      const payload = Object.assign({}, input, { token });
      upstream = await fetch(scriptUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      return reply(400, { ok: false, error: 'Unsupported Removals action.' });
    }

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch (_) {
      return reply(502, { ok: false, error: 'Google Apps Script returned a non-JSON response. Confirm the Web App is deployed for Anyone access and that the URL is the /exec URL, not /dev.' });
    }
    if (!upstream.ok) return reply(502, { ok: false, error: data.error || ('Google Apps Script returned HTTP ' + upstream.status) });
    return reply(200, data);
  } catch (err) {
    return reply(502, { ok: false, error: 'Could not reach Google Apps Script: ' + String(err && err.message || err).slice(0, 180) });
  }
};
