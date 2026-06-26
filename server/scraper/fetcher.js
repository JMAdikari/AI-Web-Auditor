const axios = require('axios');

// Sites check Accept-Language, Accept-Encoding, and a full UA string to filter bots.
// A stripped UA like "WebAuditBot/1.0" gets blocked immediately by most CDN-level rules.
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 15000,
      maxRedirects: 5,
      decompress: true,
    });
    return {
      html: response.data,
      statusCode: response.status,
      finalUrl: response.request?.res?.responseUrl || url,
      headers: response.headers,
    };
  } catch (error) {
    const status = error.response?.status;
    if (status === 403) throw new Error(`Access denied (403) for ${url} — this site blocks automated requests. Try a different URL.`);
    if (status === 404) throw new Error(`Page not found (404): ${url}`);
    if (status === 429) throw new Error(`Rate limited (429) by ${url} — too many requests. Try again in a moment.`);
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error(`Timeout fetching ${url} — the site is too slow or requires JavaScript to render. Try a static HTML page.`);
    }
    if (error.code === 'ENOTFOUND') throw new Error(`Domain not found: ${url} — check the URL is correct.`);
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}

module.exports = { fetchPage };
