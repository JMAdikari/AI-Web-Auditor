const STORAGE_KEY_AUDIT = 'wat_last_audit';
const STORAGE_KEY_COMPARE = 'wat_last_compare';
const STORAGE_KEY_TAB = 'wat_active_tab';

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector(`.tab[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  hideError();

  if (tab === 'audit') {
    document.getElementById('compareResults').classList.add('hidden');
    const saved = loadFromStorage(STORAGE_KEY_AUDIT);
    if (saved) {
      showAuditResults(saved);
    } else {
      document.getElementById('results').classList.add('hidden');
      showLanding(true);
    }
  } else {
    document.getElementById('results').classList.add('hidden');
    const saved = loadFromStorage(STORAGE_KEY_COMPARE);
    if (saved) {
      showCompareResults(saved);
    } else {
      document.getElementById('compareResults').classList.add('hidden');
      showLanding(true);
    }
  }

  localStorage.setItem(STORAGE_KEY_TAB, tab);
}

function saveToStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
}

function loadFromStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
}

function showLanding(show) {
  document.getElementById('landing-features').classList.toggle('hidden', !show);
}

async function runAudit() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return alert('Please enter a URL');

  showLoading(true, 'Fetching and analyzing page...');
  hideError();
  showLanding(false);
  document.getElementById('results').classList.add('hidden');

  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok && !response.headers.get('content-type')?.includes('application/json')) {
      throw new Error(`Server error ${response.status} — try restarting the server`);
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Audit failed');

    saveToStorage(STORAGE_KEY_AUDIT, data);
    showAuditResults(data);
  } catch (err) {
    showError(err.message);
    showLanding(true);
  } finally {
    showLoading(false);
  }
}

function showAuditResults(data) {
  showLanding(false);
  document.getElementById('resultsUrl').textContent = data.factualMetrics.url;
  renderMetrics(data.factualMetrics);
  renderAnalysis(data.aiAnalysis);
  renderRecommendations(data.aiAnalysis.recommendations);
  document.getElementById('results').classList.remove('hidden');
}

function clearAudit() {
  localStorage.removeItem(STORAGE_KEY_AUDIT);
  document.getElementById('results').classList.add('hidden');
  document.getElementById('urlInput').value = '';
  showLanding(true);
}

async function runCompare() {
  const url1 = document.getElementById('url1Input').value.trim();
  const url2 = document.getElementById('url2Input').value.trim();
  if (!url1 || !url2) return alert('Please enter both URLs');

  showLoading(true, 'Fetching and comparing both pages...');
  hideError();
  showLanding(false);
  document.getElementById('compareResults').classList.add('hidden');

  try {
    const response = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url1, url2 }),
    });

    if (!response.ok && !response.headers.get('content-type')?.includes('application/json')) {
      throw new Error(`Server error ${response.status} — try restarting the server`);
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Comparison failed');

    saveToStorage(STORAGE_KEY_COMPARE, data);
    showCompareResults(data);
  } catch (err) {
    showError(err.message);
    showLanding(true);
  } finally {
    showLoading(false);
  }
}

function showCompareResults(data) {
  showLanding(false);
  const h1 = new URL(data.page1.url).hostname;
  const h2 = new URL(data.page2.url).hostname;
  document.getElementById('compareResultsLabel').textContent = `${h1}  vs  ${h2}`;
  renderCompareResults(data);
  document.getElementById('compareResults').classList.remove('hidden');
}

function clearCompare() {
  localStorage.removeItem(STORAGE_KEY_COMPARE);
  document.getElementById('compareResults').classList.add('hidden');
  document.getElementById('url1Input').value = '';
  document.getElementById('url2Input').value = '';
  showLanding(true);
}

function renderMetrics(metrics) {
  document.getElementById('metricsGrid').innerHTML = `
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
      <div class="metric-label">Int / Ext Links</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.images.total}</div>
      <div class="metric-label">Images</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${metrics.images.missingAltPercent}%</div>
      <div class="metric-label">Missing Alt Text</div>
    </div>
    <div class="metric-card wide">
      <div class="metric-label">Meta Title</div>
      <div class="metric-text">${metrics.meta.title || 'MISSING'} <span style="color:#aaa">(${metrics.meta.titleLength} chars)</span></div>
    </div>
    <div class="metric-card wide">
      <div class="metric-label">Meta Description</div>
      <div class="metric-text">${metrics.meta.description || 'MISSING'} <span style="color:#aaa">(${metrics.meta.descriptionLength} chars)</span></div>
    </div>
  `;
}

function renderAnalysis(analysis) {
  const categories = [
    { key: 'seoAnalysis', title: 'SEO Structure' },
    { key: 'messagingAnalysis', title: 'Messaging Clarity' },
    { key: 'ctaAnalysis', title: 'CTA Usage' },
    { key: 'contentDepthAnalysis', title: 'Content Depth' },
    { key: 'uxConcerns', title: 'UX Concerns' },
  ];

  document.getElementById('analysisContent').innerHTML = categories.map(cat => {
    const section = analysis[cat.key];
    if (!section) return '';
    const scoreColor = section.score >= 7 ? '#27ae60' : section.score >= 4 ? '#f39c12' : '#e74c3c';
    return `
      <div class="analysis-card">
        <div class="analysis-header">
          <h3>${cat.title}</h3>
          <div class="score" style="color:${scoreColor}">${section.score}/10</div>
        </div>
        <div class="findings">
          ${(section.findings || []).map(f => `
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
    container.innerHTML = '<p style="color:#888">No recommendations generated.</p>';
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

function renderCompareResults(data) {
  const { page1, page2, comparison } = data;
  const h1 = new URL(page1.url).hostname;
  const h2 = new URL(page2.url).hostname;

  const winnerName = comparison.winner === 'page1' ? h1
    : comparison.winner === 'page2' ? h2 : 'Tie';

  document.getElementById('compareHeader').innerHTML = `
    <div class="compare-header-card">
      <div class="compare-winner">Overall Winner: <strong>${winnerName}</strong></div>
      <p class="compare-summary">${comparison.summary}</p>
    </div>
  `;

  document.getElementById('compareMetrics').innerHTML = `
    <div class="compare-metrics-grid">
      <div class="compare-col-header">Metric</div>
      <div class="compare-col-header">${h1}</div>
      <div class="compare-col-header">${h2}</div>
      ${buildMetricRow('Word Count', page1.factualMetrics.wordCount.toLocaleString(), page2.factualMetrics.wordCount.toLocaleString())}
      ${buildMetricRow('H1 / H2 / H3', `${page1.factualMetrics.headings.h1}/${page1.factualMetrics.headings.h2}/${page1.factualMetrics.headings.h3}`, `${page2.factualMetrics.headings.h1}/${page2.factualMetrics.headings.h2}/${page2.factualMetrics.headings.h3}`)}
      ${buildMetricRow('CTAs', page1.factualMetrics.cta.count, page2.factualMetrics.cta.count)}
      ${buildMetricRow('Int / Ext Links', `${page1.factualMetrics.links.internal}/${page1.factualMetrics.links.external}`, `${page2.factualMetrics.links.internal}/${page2.factualMetrics.links.external}`)}
      ${buildMetricRow('Images', page1.factualMetrics.images.total, page2.factualMetrics.images.total)}
      ${buildMetricRow('Missing Alt', `${page1.factualMetrics.images.missingAltPercent}%`, `${page2.factualMetrics.images.missingAltPercent}%`)}
      ${buildMetricRow('Meta Title', `${page1.factualMetrics.meta.titleLength} chars`, `${page2.factualMetrics.meta.titleLength} chars`)}
      ${buildMetricRow('Meta Desc', `${page1.factualMetrics.meta.descriptionLength} chars`, `${page2.factualMetrics.meta.descriptionLength} chars`)}
    </div>
  `;

  document.getElementById('compareCategories').innerHTML = (comparison.categories || []).map(cat => {
    const p1Color = cat.page1Score >= 7 ? '#27ae60' : cat.page1Score >= 4 ? '#f39c12' : '#e74c3c';
    const p2Color = cat.page2Score >= 7 ? '#27ae60' : cat.page2Score >= 4 ? '#f39c12' : '#e74c3c';
    const winnerTag = cat.winner === 'tie'
      ? '<span class="winner-tie">Tie</span>'
      : `<span class="winner-tag">${cat.winner === 'page1' ? h1 : h2} wins</span>`;
    return `
      <div class="analysis-card">
        <div class="analysis-header">
          <h3>${cat.name}</h3>
          ${winnerTag}
        </div>
        <div class="compare-scores">
          <span style="color:${p1Color}">${h1}: ${cat.page1Score}/10</span>
          <span style="color:${p2Color}">${h2}: ${cat.page2Score}/10</span>
        </div>
        <p class="compare-insight">${cat.insight}</p>
      </div>
    `;
  }).join('');

  document.getElementById('compareAdvantages').innerHTML = `
    <div class="advantages-grid">
      <div class="advantage-col">
        <h3>${h1} strengths</h3>
        <ul>${(comparison.page1Advantages || []).map(a => `<li>${a}</li>`).join('')}</ul>
      </div>
      <div class="advantage-col">
        <h3>${h2} strengths</h3>
        <ul>${(comparison.page2Advantages || []).map(a => `<li>${a}</li>`).join('')}</ul>
      </div>
    </div>
  `;

  document.getElementById('compareRecommendations').innerHTML = (comparison.recommendations || []).map(rec => `
    <div class="rec-card">
      <div class="rec-header">
        <span class="rec-priority">For: ${rec.targetPage === 'page1' ? h1 : h2}</span>
      </div>
      <h3>${rec.title}</h3>
      <p>${rec.description}</p>
      <div class="rec-basis">Based on: ${rec.basedOn}</div>
    </div>
  `).join('');
}

function buildMetricRow(label, val1, val2) {
  return `
    <div class="compare-row-label">${label}</div>
    <div class="compare-row-val">${val1}</div>
    <div class="compare-row-val">${val2}</div>
  `;
}

function fillUrl(url) {
  const activeTab = localStorage.getItem(STORAGE_KEY_TAB) || 'audit';
  if (activeTab === 'compare') {
    const u1 = document.getElementById('url1Input');
    const u2 = document.getElementById('url2Input');
    if (!u1.value) { u1.value = url; u1.focus(); }
    else { u2.value = url; u2.focus(); }
  } else {
    document.getElementById('urlInput').value = url;
    document.getElementById('urlInput').focus();
  }
}

function showLoading(show, text) {
  document.getElementById('loading').classList.toggle('hidden', !show);
  const ab = document.getElementById('analyzeBtn');
  const cb = document.getElementById('compareBtn');
  if (ab) ab.disabled = show;
  if (cb) cb.disabled = show;
  if (text) document.getElementById('loadingText').textContent = text;
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error').classList.add('hidden');
}

(function init() {
  const savedTab = localStorage.getItem(STORAGE_KEY_TAB) || 'audit';

  if (savedTab === 'compare') {
    switchTab('compare');
  } else {
    const saved = loadFromStorage(STORAGE_KEY_AUDIT);
    if (saved) {
      showAuditResults(saved);
    } else {
      showLanding(true);
    }
  }
})();
