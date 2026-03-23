# Multi-Page Crawler Upgrade TODO

## Plan:
**Information:** scraper.js single page → needs recursive crawl (max 15 pages, same domain).

**File edits:**
1. **backend/scraper.js**: 
   - async scrapeWebsite(baseUrl): crawl queue, visited Set
   - Extract internal links (a[href^='/'] or same origin)
   - For 15 pages: clean, extract text, append to allText
   - Return {text: allText.slice(0,10000), images, success}
2. **backend/server.js**: Use full scrapedData.text for RAG prompts

**Followup:** Restart server, test with multi-page site (courses/contact pages found).

Proceed?

