const fs = require('fs');
const path = require('path');

function buildSystemPrompt() {
  return fs.readFileSync(
    path.join(__dirname, 'prompts', 'systemPrompt.txt'),
    'utf-8'
  );
}

function buildUserPrompt(metrics, content) {
  // Plain text format is intentional — labeled lists are easier for the model
  // to reference back to specific values than a nested JSON blob
  return `
FACTUAL METRICS FOR: ${metrics.url}
====================================

Word Count: ${metrics.wordCount}

Headings:
- H1 count: ${metrics.headings.h1} ${metrics.headings.h1Texts.length > 0 ? '(text: "' + metrics.headings.h1Texts.join('", "') + '")' : ''}
- H2 count: ${metrics.headings.h2} ${metrics.headings.h2Texts.length > 0 ? '(text: "' + metrics.headings.h2Texts.join('", "') + '")' : ''}
- H3 count: ${metrics.headings.h3}

CTAs:
- Total CTA elements: ${metrics.cta.count}
- CTA texts: ${metrics.cta.texts.length > 0 ? '"' + metrics.cta.texts.join('", "') + '"' : 'none found'}

Links:
- Internal links: ${metrics.links.internal}
- External links: ${metrics.links.external}
- Total links: ${metrics.links.total}

Images:
- Total images: ${metrics.images.total}
- Images missing alt text: ${metrics.images.missingAlt} (${metrics.images.missingAltPercent}%)

Meta Tags:
- Title: ${metrics.meta.title || 'MISSING'} (${metrics.meta.titleLength} chars)
- Description: ${metrics.meta.description || 'MISSING'} (${metrics.meta.descriptionLength} chars)

Page Structure:
- Sections detected: ${content.sectionCount}
- Has navigation: ${content.structuralElements.hasNav}
- Has footer: ${content.structuralElements.hasFooter}
- Forms on page: ${content.structuralElements.formCount}
- Videos on page: ${content.structuralElements.videoCount}

PAGE CONTENT SUMMARY:
====================================
${content.mainText}

Analyze this page and provide your structured assessment as JSON.
  `.trim();
}

module.exports = { buildSystemPrompt, buildUserPrompt };
