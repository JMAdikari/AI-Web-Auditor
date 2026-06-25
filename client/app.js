async function runAudit() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return alert('Please enter a URL');

  showLoading(true);
  hideError();
  document.getElementById('results').classList.add('hidden');

  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Audit failed');
    }

    renderMetrics(data.factualMetrics);
    renderAnalysis(data.aiAnalysis);
    renderRecommendations(data.aiAnalysis.recommendations);

    document.getElementById('results').classList.remove('hidden');
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

function renderMetrics(metrics) {
  const grid = document.getElementById('metricsGrid');
  grid.innerHTML = `
    <div class="metric-card">
      <div class="metric-value">${metrics.wordCount.toLocaleString()}</div>
      <div class="metric-label">Total Words</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.headings.h1}</div>
      <div class="metric-label">H1 Tags</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.headings.h2}</div>
      <div class="metric-label">H2 Tags</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.headings.h3}</div>
      <div class="metric-label">H3 Tags</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.cta.count}</div>
      <div class="metric-label">CTAs Found</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.links.internal} / ${metrics.links.external}</div>
      <div class="metric-label">Internal / External Links</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.images.total}</div>
      <div class="metric-label">Images</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.images.missingAltPercent}%</div>
      <div class="metric-label">Images Missing Alt Text</div>
    </div>
    <div class="metric-card wide">
      <div class="metric-label">Meta Title</div>
      <div class="metric-text">${metrics.meta.title || 'MISSING'} (${metrics.meta.titleLength} chars)</div>
    </div>
    <div class="metric-card wide">
      <div class="metric-label">Meta Description</div>
      <div class="metric-text">${metrics.meta.description || 'MISSING'} (${metrics.meta.descriptionLength} chars)</div>
    </div>
  `;
}

function renderAnalysis(analysis) {
  const container = document.getElementById('analysisContent');
  const categories = [
    { key: 'seoAnalysis', title: 'SEO Structure' },
    { key: 'messagingAnalysis', title: 'Messaging Clarity' },
    { key: 'ctaAnalysis', title: 'CTA Usage' },
    { key: 'contentDepthAnalysis', title: 'Content Depth' },
    { key: 'uxConcerns', title: 'UX Concerns' },
  ];

  container.innerHTML = categories.map(cat => {
    const section = analysis[cat.key];
    if (!section) return '';

    const scoreColor = section.score >= 7 ? 'green' : section.score >= 4 ? 'orange' : 'red';

    return `
      <div class="analysis-card">
        <div class="analysis-header">
          <h3>${cat.title}</h3>
          <div class="score" style="color: ${scoreColor}">${section.score}/10</div>
        </div>
        <div class="findings">
          ${section.findings.map(f => `
            <div class="finding ${f.impact}">
              <div class="finding-issue">${f.issue}</div>
              <div class="finding-metric">Based on: ${f.metric}</div>
              <div class="finding-detail">${f.detail}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderRecommendations(recs) {
  const container = document.getElementById('recommendations');
  if (!recs || recs.length === 0) {
    container.innerHTML = '<p>No recommendations generated.</p>';
    return;
  }

  container.innerHTML = recs.map(rec => `
    <div class="rec-card">
      <div class="rec-header">
        <span class="rec-priority">Priority ${rec.priority}</span>
        <span class="rec-effort">Effort: ${rec.effort}</span>
        <span class="rec-impact">Impact: ${rec.impact}</span>
      </div>
      <h3>${rec.title}</h3>
      <p>${rec.description}</p>
      <div class="rec-basis">Based on: ${rec.basedOn}</div>
    </div>
  `).join('');
}

function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
  document.getElementById('analyzeBtn').disabled = show;
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error').classList.add('hidden');
}
