# Chatbot Fixes TODO

**Gathered:**
- Text break: CSS .message flex issue
- Crawler: 1 page (add priority /contact etc)
- AI: Plain text → instruct bullets/contact extraction

**Plan:**
1. **frontend/style.css**: .message { word-break: break-word; white-space: normal; line-height: 1.5; }
2. **backend/scraper.js**: Priority queue common paths (/contact, /about...)
3. **backend/server.js**: Prompt "Extract contact/location/services as bullets. Use • format."
4. Test multi-page crawl + formatted responses.

Approve?

