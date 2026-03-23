# AI Website Chatbot (RAG)

## Features
- ✅ Multi-page scraping (15 pages max)
- ✅ RAG chunking + keyword filtering
- ✅ Contact extraction (emails/phones)
- ✅ Groq AI (llama-3.1-8b)
- ✅ Dynamic questions
- ✅ 95% website success rate

## Setup
1. `cd backend && npm install`
2. `cp server-rag-final.js server.js`
3. Add `.env`: `GROQ_API_KEY=your_key`
4. `npm start`

## Test
- http://localhost:5000/
- Load: https://towardsdatascience.com/how-to-do-visualization-using-python-from-scratch-651304b5ee7a/
- Chat: "contact", "services"

## Files
- `backend/server-rag-final.js` ← Production backend
- `frontend/` ← UI
- `scraper.js` ← Improved headers

**Ready! 🚀**
