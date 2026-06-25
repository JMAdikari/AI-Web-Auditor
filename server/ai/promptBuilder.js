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

function buildComparisonPrompt(metrics1, metrics2, content1, content2) {
  return `
You are comparing two competing webpages. Analyze both sets of metrics side by side and identify
which page performs better in each area and why. Reference specific numbers when making comparisons.

PAGE 1: ${metrics1.url}
====================================
Word Count: ${metrics1.wordCount}
H1: ${metrics1.headings.h1} | H2: ${metrics1.headings.h2} | H3: ${metrics1.headings.h3}
H1 texts: ${metrics1.headings.h1Texts.join(', ') || 'none'}
CTAs: ${metrics1.cta.count} (${metrics1.cta.texts.slice(0, 5).join(', ') || 'none'})
Internal links: ${metrics1.links.internal} | External: ${metrics1.links.external}
Images: ${metrics1.images.total} | Missing alt: ${metrics1.images.missingAltPercent}%
Meta title: ${metrics1.meta.title || 'MISSING'} (${metrics1.meta.titleLength} chars)
Meta description: ${metrics1.meta.description || 'MISSING'} (${metrics1.meta.descriptionLength} chars)
Has nav: ${metrics1.structuralElements?.hasNav} | Has footer: ${metrics1.structuralElements?.hasFooter}

CONTENT SUMMARY (Page 1):
${content1.mainText.substring(0, 1500)}

PAGE 2: ${metrics2.url}
====================================
Word Count: ${metrics2.wordCount}
H1: ${metrics2.headings.h1} | H2: ${metrics2.headings.h2} | H3: ${metrics2.headings.h3}
H1 texts: ${metrics2.headings.h1Texts.join(', ') || 'none'}
CTAs: ${metrics2.cta.count} (${metrics2.cta.texts.slice(0, 5).join(', ') || 'none'})
Internal links: ${metrics2.links.internal} | External: ${metrics2.links.external}
Images: ${metrics2.images.total} | Missing alt: ${metrics2.images.missingAltPercent}%
Meta title: ${metrics2.meta.title || 'MISSING'} (${metrics2.meta.titleLength} chars)
Meta description: ${metrics2.meta.description || 'MISSING'} (${metrics2.meta.descriptionLength} chars)
Has nav: ${metrics2.structuralElements?.hasNav} | Has footer: ${metrics2.structuralElements?.hasFooter}

CONTENT SUMMARY (Page 2):
${content2.mainText.substring(0, 1500)}

Respond in valid JSON only, no markdown:
{
  "winner": "page1|page2|tie",
  "summary": "<2-3 sentence overall comparison>",
  "categories": [
    {
      "name": "SEO Structure",
      "winner": "page1|page2|tie",
      "page1Score": <1-10>,
      "page2Score": <1-10>,
      "insight": "<specific comparison referencing actual numbers>"
    },
    {
      "name": "Content Depth",
      "winner": "page1|page2|tie",
      "page1Score": <1-10>,
      "page2Score": <1-10>,
      "insight": "<specific comparison referencing actual numbers>"
    },
    {
      "name": "CTA Strategy",
      "winner": "page1|page2|tie",
      "page1Score": <1-10>,
      "page2Score": <1-10>,
      "insight": "<specific comparison referencing actual numbers>"
    },
    {
      "name": "Messaging Clarity",
      "winner": "page1|page2|tie",
      "page1Score": <1-10>,
      "page2Score": <1-10>,
      "insight": "<specific comparison referencing actual numbers>"
    },
    {
      "name": "Accessibility",
      "winner": "page1|page2|tie",
      "page1Score": <1-10>,
      "page2Score": <1-10>,
      "insight": "<specific comparison referencing actual numbers>"
    }
  ],
  "page1Advantages": ["<specific strength>", ...],
  "page2Advantages": ["<specific strength>", ...],
  "recommendations": [
    {
      "targetPage": "page1|page2",
      "title": "<short title>",
      "description": "<what to adopt from the other page and why>",
      "basedOn": "<the specific metric difference>"
    }
  ]
}
  `.trim();
}

module.exports = { buildSystemPrompt, buildUserPrompt, buildComparisonPrompt };
