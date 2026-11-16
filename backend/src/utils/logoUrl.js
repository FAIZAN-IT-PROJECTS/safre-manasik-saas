// Resolve a user-provided logo URL into a usable DIRECT image URL.
//
// Tenant admins paste all kinds of links into the Logo URL field. The most
// common mistake is pasting a "share page" (e.g. https://ibb.co/abc123) instead
// of the direct image file — an <img> can never render a share page, so the
// logo silently falls back to the platform default. This helper converts the
// well-known share links to their direct-image equivalents so the logo just
// works. Uploaded logos (data: URLs) and already-direct URLs pass through.
//
// Safety: the only host we make an outbound request to is ImgBB (ibb.co), and
// the extracted result must itself be an https i.ibb.co image URL — no SSRF to
// arbitrary user-supplied hosts. Never throws; returns the input on any failure.

// Google Drive: .../file/d/<ID>/view  or  ...open?id=<ID>  → uc?export=view&id=<ID>
function driveDirect(u) {
  try {
    const url = new URL(u);
    if (!/(^|\.)drive\.google\.com$/i.test(url.hostname)) return null;
    const m = url.pathname.match(/\/file\/d\/([^/]+)/);
    const id = (m && m[1]) || url.searchParams.get('id');
    return id ? `https://drive.google.com/uc?export=view&id=${id}` : null;
  } catch { return null; }
}

// Dropbox share link (?dl=0) → raw file (?raw=1)
function dropboxDirect(u) {
  try {
    const url = new URL(u);
    if (!/(^|\.)dropbox\.com$/i.test(url.hostname)) return null;
    url.searchParams.delete('dl');
    url.searchParams.set('raw', '1');
    return url.toString();
  } catch { return null; }
}

// Imgur single-image page (imgur.com/<id>) → i.imgur.com/<id>.png
function imgurDirect(u) {
  try {
    const url = new URL(u);
    if (!/(^|\.)imgur\.com$/i.test(url.hostname)) return null;
    if (/^i\./i.test(url.hostname)) return null; // already direct
    const m = url.pathname.match(/^\/([A-Za-z0-9]{5,12})$/);
    return m ? `https://i.imgur.com/${m[1]}.png` : null;
  } catch { return null; }
}

// ImgBB share page (ibb.co/<code>) → i.ibb.co/<hash>/<file>.<ext>.
// Requires fetching the page; host is whitelisted and the result is validated.
async function ibbDirect(u) {
  try {
    const url = new URL(u);
    if (!/^(www\.)?ibb\.co$/i.test(url.hostname)) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let html = '';
    try {
      const res = await fetch(u, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SafreManasik/1.0)' },
      });
      if (!res.ok) return null;
      html = (await res.text()).slice(0, 300000);
    } finally { clearTimeout(timer); }
    const m = html.match(/https:\/\/i\.ibb\.co\/[A-Za-z0-9]+\/[^"'\s<>]+?\.(?:jpe?g|png|gif|webp|bmp)/i);
    return m ? m[0] : null;
  } catch { return null; }
}

async function resolveLogoUrl(raw) {
  const v = (raw == null ? '' : String(raw)).trim();
  if (!v) return v;                          // blank → clear logo
  if (/^data:image\//i.test(v)) return v;    // uploaded logo — keep verbatim
  if (!/^https?:\/\//i.test(v)) return v;    // relative/unknown — leave untouched
  try {
    return driveDirect(v) || dropboxDirect(v) || imgurDirect(v) || (await ibbDirect(v)) || v;
  } catch { return v; }
}

module.exports = { resolveLogoUrl };
