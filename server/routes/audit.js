const express = require('express');
const router = express.Router();
const { fetchPage } = require('../scraper/fetcher');
const { extractMetrics } = require('../scraper/metricExtractor');
const { extractContent } = require('../scraper/contentExtractor');
const { analyzeWithAI, analyzeComparison } = require('../ai/analyzer');

async function auditSinglePage(url) {
  const pageData = await fetchPage(url);
  const metrics = extractMetrics(pageData.html, url);
  const content = extractContent(pageData.html);
  return { metrics, content, statusCode: pageData.statusCode, finalUrl: pageData.finalUrl };
}

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
    const { metrics, content, statusCode, finalUrl } = await auditSinglePage(url);

    // factualMetrics and aiAnalysis are kept at the same response level
    // so the separation between measured data and interpreted data is explicit
    const { analysis, meta } = await analyzeWithAI(metrics, content);

    res.json({
      success: true,
      factualMetrics: metrics,
      aiAnalysis: analysis,
      metadata: {
        analyzedAt: new Date().toISOString(),
        statusCode,
        finalUrl,
        aiMeta: meta,
      },
    });

  } catch (error) {
    console.error('Audit failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/compare', async (req, res) => {
  const { url1, url2 } = req.body;

  if (!url1 || !url2) {
    return res.status(400).json({ error: 'Both url1 and url2 are required' });
  }

  try {
    new URL(url1);
    new URL(url2);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    // Fetch and extract both pages in parallel
    const [page1, page2] = await Promise.all([
      auditSinglePage(url1),
      auditSinglePage(url2),
    ]);

    const { comparison, meta } = await analyzeComparison(
      page1.metrics, page2.metrics,
      page1.content, page2.content
    );

    res.json({
      success: true,
      page1: { url: url1, factualMetrics: page1.metrics },
      page2: { url: url2, factualMetrics: page2.metrics },
      comparison,
      metadata: {
        analyzedAt: new Date().toISOString(),
        aiMeta: meta,
      },
    });

  } catch (error) {
    console.error('Comparison failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
