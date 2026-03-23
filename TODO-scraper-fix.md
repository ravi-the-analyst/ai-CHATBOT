# Scraper Fix - Robust Hybrid (Playwright + Axios)

## Progress
- [x] Plan approved
- [x] 1. Playwright browsers installed
- [x] 2. server.js /scan debug log added
- [x] 3. scraper.js Playwright fixes: sandbox args, domcontentloaded + 3s wait, axios timeout 15s
- [ ] 4. Test https://www.dnyanshree.edu.in (run server, POST /scan, check logs)
- [ ] 5. Complete

## Test Command
```bash
cd backend && npm start
```
Then test site in frontend or curl POST /scan {url: 'https://www.dnyanshree.edu.in'}

## Expected Logs
```
🚀 Hybrid scraper starting: https://www.dnyanshree.edu.in
🔹 Layer 1: Axios multi-page crawl...  ✅ Layer 1 success: XXXX chars
🔍 SCRAPER RESULT: { success: true, textLength: >1000 }
```
OR Playwright fallback success.

✅ Ready for test - no more Connection errors!
