const express = require('express');
const router = express.Router();
const { fetchPage } = require('../scraper/fetcher');
const { extractMetrics } = require('../scraper/metricExtractor');
const { extractContent } = require('../scraper/contentExtractor');
const { analyzeWithAI } = require('../ai/analyzer');

router.post('/audit', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    const pageData = await fetchPage(url);

    // factualMetrics and aiAnalysis are kept at the same response level
    // so the separation between measured data and interpreted data is explicit
    const metrics = extractMetrics(pageData.html, url);
    const content = extractContent(pageData.html);
    const { analysis, meta } = await analyzeWithAI(metrics, content);

    res.json({
      success: true,
      factualMetrics: metrics,
      aiAnalysis: analysis,
      metadata: {
        analyzedAt: new Date().toISOString(),
        statusCode: pageData.statusCode,
        finalUrl: pageData.finalUrl,
        aiMeta: meta,
      },
    });

  } catch (error) {
    console.error('Audit failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
