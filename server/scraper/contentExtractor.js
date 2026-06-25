const cheerio = require('cheerio');

function extractContent(html) {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $('script, style, noscript, iframe, svg, nav, footer, header').remove();

  // Extract text by section (rough structure)
  const sections = [];
  $('body').children().each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 20) {
      sections.push(text.substring(0, 500)); // Cap per section
    }
  });

  // Get the page's main content (first ~3000 chars)
  const mainText = sections.join('\n\n').substring(0, 3000);

  // Check for common structural elements
  const hasNav = $('nav, [role="navigation"]').length > 0;
  const hasFooter = $('footer, [role="contentinfo"]').length > 0;
  const hasForms = $('form').length;
  const hasVideo = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;

  return {
    mainText,
    structuralElements: {
      hasNav,
      hasFooter,
      formCount: hasForms,
      videoCount: hasVideo,
    },
    sectionCount: sections.length,
  };
}

module.exports = { extractContent };
