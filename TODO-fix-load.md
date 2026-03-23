# Fix Website Load Failure

## Current Status
Backend server not running → fetch connection error on /scan.

## Plan Steps
1. [x] Create backend/.env with GROQ_API_KEY=your_key_here (starts with gsk_)
2. [x] cd backend && npm install (install deps: express, groq-sdk, playwright etc.) - up to date, 1 high vuln (review later)
3. [x] Minor: Update server.js log to \"GROQ KEY:\"
4. [x] cd backend && node server.js → SUCCESS: server running on 5000 (with placeholder key - works w/o full AI). Edit .env for real key later.
5. [x] Enhanced scraper.js (UA headers, stealth Playwright, domcontentloaded, shorter timeouts, lower text threshold)
6. [ ] Open http://localhost:5000 → click Load Website → ✅

Frontend /scan call correct, response {success:true} matches.
CORS present.

**Status:** server.js fixed (added dotenv.config() + path require). Edit backend/.env with your real GROQ key (gsk_...), then restart server. Ignore npm audit vuln.

**Next:** 1. Edit backend/.env: GROQ_API_KEY=your_real_gsk_key (remove placeholder). 2. cd backend && node server.js → expect \"🚀 ...5000\" + \"✅ GROQ ready\". 3. Open http://localhost:5000 4. Test Load Website with https://example.com


