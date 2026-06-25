const cheerio = require('cheerio');

function extractMetrics(html, url) {
  const $ = cheerio.load(html);

  // Remove script, style, and nav content from word counting
  const $bodyClone = $('body').clone();
  $bodyClone.find('script, style, noscript, iframe').remove();
  const bodyText = $bodyClone.text().replace(/\s+/g, ' ').trim();

  // Word count
  const words = bodyText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // Heading counts
  const headings = {
    h1: $('h1').length,
    h2: $('h2').length,
    h3: $('h3').length,
    h1Texts: $('h1').map((_, el) => $(el).text().trim()).get(),
    h2Texts: $('h2').map((_, el) => $(el).text().trim()).get(),
    h3Texts: $('h3').map((_, el) => $(el).text().trim()).get(),
  };

  // CTAs — buttons and links that look like primary actions
  const ctaSelectors = [
    'button',
    'a.btn', 'a.button', 'a.cta',
    'a[class*="btn"]', 'a[class*="button"]', 'a[class*="cta"]',
    'input[type="submit"]',
    '[role="button"]',
  ];
  const ctaElements = $(ctaSelectors.join(', '));
  const ctaCount = ctaElements.length;
  const ctaTexts = ctaElements.map((_, el) => $(el).text().trim()).get()
    .filter(t => t.length > 0);

  // Links
  const allLinks = $('a[href]');
  const parsedUrl = new URL(url);
  let internalLinks = 0;
  let externalLinks = 0;

  allLinks.each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    try {
      const linkUrl = new URL(href, url);
      if (linkUrl.hostname === parsedUrl.hostname) {
        internalLinks++;
      } else {
        externalLinks++;
      }
    } catch {
      internalLinks++; // Relative URLs are internal
    }
  });

  // Images and alt text
  const images = $('img');
  const totalImages = images.length;
  let missingAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr('alt');
    if (!alt || alt.trim() === '') {
      missingAlt++;
    }
  });
  const missingAltPercent = totalImages > 0
    ? Math.round((missingAlt / totalImages) * 100)
    : 0;

  // Meta tags
  const metaTitle = $('title').text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || null;
  const metaTitleLength = metaTitle ? metaTitle.length : 0;
  const metaDescriptionLength = metaDescription ? metaDescription.length : 0;

  return {
    url,
    wordCount,
    headings,
    cta: {
      count: ctaCount,
      texts: ctaTexts.slice(0, 15), // Cap to avoid huge payloads
    },
    links: {
      internal: internalLinks,
      external: externalLinks,
      total: internalLinks + externalLinks,
    },
    images: {
      total: totalImages,
      missingAlt: missingAlt,
      missingAltPercent: missingAltPercent,
    },
    meta: {
      title: metaTitle,
      titleLength: metaTitleLength,
      description: metaDescription,
      descriptionLength: metaDescriptionLength,
    },
  };
}

module.exports = { extractMetrics };
