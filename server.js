require('dotenv').config({ path: __dirname + '/.env' })

const express  = require('express')
const cors     = require('cors')
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const axios    = require('axios')
const cheerio  = require('cheerio')

const app  = express()
const PORT = 5000

app.use(cors({ origin: '*' }))
app.use(express.json())

// ── GLOBAL STATE ─────────────────────────────────
let companyData   = ''
let companyImages = []
let companyUrl    = ''
let dataSource    = ''
// ─────────────────────────────────────────────────

const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  })
})

app.get('/', (req, res) => {
  res.json({
    status:     'ok',
    port:       PORT,
    groq:       !!process.env.GROQ_API_KEY,
    hasData:    !!companyData,
    dataLength: companyData.length,
    dataSource: dataSource
  })
})

app.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.json({ success: false, error: 'URL required' })

    console.log('🔍 Scraping:', url)
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 15000
    })

    const $ = cheerio.load(response.data)
    $('script,style,nav,footer,iframe,noscript').remove()

    const pageText = $('body').text().replace(/\s+/g, ' ').trim()

    const images = []
    $('img').each((i, el) => {
      let src = $(el).attr('src') || ''
      const alt = $(el).attr('alt') || ''
      if (src.startsWith('/')) src = new URL(src, url).href
      if (src.startsWith('http') && /\.(jpg|jpeg|png|webp|gif|svg)/i.test(src)) {
        images.push({ src, alt })
      }
    })

    companyData   = pageText
    companyImages = images
    companyUrl    = url
    dataSource    = 'website'

    console.log('✅ companyData length:', companyData.length)
    console.log('✅ Images:', companyImages.length)

    res.json({
      success:     true,
      characters:  companyData.length,
      linksFound:  0,
      imagesFound: companyImages.length
    })
  } catch (err) {
    console.error('❌ Scrape error:', err.message)
    res.json({ success: false, error: err.message })
  }
})

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ success: false, error: 'No file received' })

    const ext    = path.extname(req.file.originalname).toLowerCase()
    const buffer = fs.readFileSync(req.file.path)
    let text     = ''

    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse')
      const result   = await pdfParse(buffer)
      text           = result.text
    } else if (ext === '.txt') {
      text = buffer.toString('utf8')
    } else if (ext === '.docx') {
      const mammoth = require('mammoth')
      const result  = await mammoth.extractRawText({ path: req.file.path })
      text          = result.value
    } else {
      return res.json({ success: false, error: 'Use PDF, TXT or DOCX only' })
    }

    companyData   = text
    companyImages = []
    companyUrl    = req.file.originalname
    dataSource    = 'file'

    console.log('✅ File loaded. Length:', companyData.length)

    res.json({ success: true, message: 'File loaded!', characters: text.length })
  } catch (err) {
    console.error('❌ Upload error:', err.message)
    res.json({ success: false, error: err.message })
  }
})

app.get('/images', (req, res) => {
  res.json({ images: companyImages })
})

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body
    console.log('💬 Message:', message)
    console.log('📄 companyData length:', companyData.length)
    console.log('📦 dataSource:', dataSource)

    if (!message) return res.json({ reply: 'Please send a message.', images: [] })

    if (!companyData || companyData.trim().length === 0) {
      return res.json({
        reply:  '⚠️ Please load a website or upload a file first!',
        images: []
      })
    }

    const lower = message.toLowerCase()
    const imageKeywords = ['image','photo','picture','logo','show',
                           'display','gallery','banner','icon','visual']
    const wantsImages = imageKeywords.some(w => lower.includes(w))

    if (wantsImages && companyImages.length > 0) {
      let filtered = [...companyImages]
      if (lower.includes('logo')) {
        const f = companyImages.filter(i =>
          (i.alt||'').toLowerCase().includes('logo') ||
          (i.src||'').toLowerCase().includes('logo'))
        if (f.length > 0) filtered = f
      }
      return res.json({
        reply:  'Here are images from the website:',
        images: filtered.slice(0, 6)
      })
    }

    if (wantsImages) {
      return res.json({
        reply:  dataSource === 'file'
          ? 'This is a document — no images available.'
          : 'No images found on this website.',
        images: []
      })
    }

    const GROQ_KEY = process.env.GROQ_API_KEY
    if (!GROQ_KEY) {
      return res.json({ reply: '❌ Groq API key missing in .env!', images: [] })
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role:    'system',
            content: 'You are an intelligent helpful assistant. Always reply in English. Be accurate and concise. Only answer from the provided content.'
          },
          {
            role:    'user',
            content: 'Content from ' + dataSource + ' (' + companyUrl + '):\n\n' +
                     companyData.substring(0, 4000) +
                     '\n\nQuestion: ' + message +
                     '\n\nAnswer in English:'
          }
        ],
        max_tokens:  700,
        temperature: 0.3
      })
    })

    const groqData = await groqRes.json()

    if (groqData.choices?.[0]?.message?.content) {
      const reply = groqData.choices[0].message.content
      console.log('✅ Reply:', reply.substring(0, 100))
      res.json({ reply, images: [] })
    } else {
      console.error('❌ Groq error:', JSON.stringify(groqData))
      res.json({
        reply:  '❌ AI error: ' + (groqData.error?.message || 'Unknown error'),
        images: []
      })
    }
  } catch (err) {
    console.error('❌ Chat error:', err.message)
    res.json({ reply: '❌ Error: ' + err.message, images: [] })
  }
})

app.listen(PORT, () => {
  console.log('✅ Server running on port', PORT)
  console.log('🔑 Groq API Key:', process.env.GROQ_API_KEY ? 'Found ✅' : 'MISSING ❌')
})