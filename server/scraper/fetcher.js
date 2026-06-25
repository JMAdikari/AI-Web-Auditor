const axios = require('axios');

async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebAuditBot/1.0)',
        'Accept': 'text/html',
      },
      timeout: 15000,
      maxRedirects: 5,
    });
    return {
      html: response.data,
      statusCode: response.status,
      finalUrl: response.request?.res?.responseUrl || url,
      headers: response.headers,
    };
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}

module.exports = { fetchPage };
