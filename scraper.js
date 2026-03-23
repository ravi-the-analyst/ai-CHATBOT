const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeWebsite(url) {
  try {
    const response = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, footer, iframe, noscript').remove();
    
    // Extract text
    const pageText = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Extract images
    const images = [];
    $('img').each((i, elem) => {
      let src = $(elem).attr('src') || $(elem).attr('data-src');
      const alt = $(elem).attr('alt') || '';
      
      if (src) {
        if (src.startsWith('/')) {
          src = new URL(src, url).href;
        }
        if (src.startsWith('http') && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(src)) {
          images.push({ src, alt });
        }
      }
    });
    
    // Extract links
    const links = [];
    $('a[href]').each((i, elem) => {
      let href = $(elem).attr('href');
      if (href) {
        if (href.startsWith('/')) {
          href = new URL(href, url).href;
        }
        if (href.startsWith('http') && !links.includes(href)) {
          links.push(href);
        }
      }
    });
    
    return { 
      pageText, 
      images: images.slice(0, 20), 
      links, 
      success: true 
    };
  } catch (err) {
    return { 
      pageText: '', 
      images: [], 
      links: [], 
      success: false, 
      error: err.message 
    };
  }
}

module.exports = { scrapeWebsite };
