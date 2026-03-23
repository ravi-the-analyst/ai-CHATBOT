# File Upload + RAG Fix Progress

## Plan Steps
1. [x] Add multer + deps requires in server.js
2. [x] Add /upload route with extraction (PDF/docx/xlsx/txt + OCR fallback)
3. [ ] Chunk/embed file text to global.fileRAG
4. [ ] Update /chat to combine website + file context
5. [ ] Frontend status updates
6. [ ] Test PDF upload → text length >100 → RAG ready
7. [ ] Restart server

**Next:** Edit server.js with multer /upload.

## Extract Logic
- PDF: pdf-parse → if text <100 tesseract OCR
- DOCX: mammoth.extractRawText
- XLSX: xlsx.utils.sheet_to_csv
- TXT: fs.readFile 'utf8'

**Expected:** "✅ File processed (X chars)"
