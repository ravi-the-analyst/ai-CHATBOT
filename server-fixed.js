require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
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

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// Module level state
let companyData = '';
let companyImages = [];
let companyUrl = '';
let dataSource = '';

const PORT = 5000;

app.get('/', (req, res) => {
  res.json({ status: 'ok', port: 5000, groq: !!process.env.GROQ_API_KEY, hasData: !!companyData });
});

app.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.json({ success: false, error: 'URL required' });
    }
    const result = await scrapeWebsite(url);
    if (result.success) {
      companyData = result.pageText;
      companyImages = result.images || [];
      companyUrl = url;
      dataSource = 'website';
      console.log('Stored companyData length:', companyData.length);
      res.json({ success: true, characters: companyData.length, 
                 linksFound: (result.links||[]).length, 
                 imagesFound: companyImages.length });
    } else {
      res.json({ success: false, error: result.error || 'Scrape failed' });
    }
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, error: 'No file received' });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    let text = '';

    if (ext === '.pdf') {
      const buffer = fs.readFileSync(req.file.path);
      const pdfResult = await pdfParse(buffer);
      text = pdfResult.text;
    } else if (ext === '.txt') {
      text = fs.readFileSync(req.file.path, 'utf8');
    } else if (ext === '.docx') {
      try {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: req.file.path });
        text = result.value;
      } catch (e) {
        return res.json({ success: false, error: 'Install mammoth: npm install mammoth' });
      }
    } else {
      return res.json({ success: false, error: 'Unsupported file type. Use PDF, TXT, or DOCX' });
    }

    companyData = text;
    companyImages = [];
    companyUrl = req.file.originalname;
    dataSource = 'file';
    console.log('Stored file text length:', companyData.length);
    fs.unlinkSync(req.file.path);
    res.json({ success: true, message: 'File loaded!', characters: text.length });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.json({ success: false, error: err.message });
  }
});

app.get('/images', (req, res) => {
  res.json({ images: companyImages });
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('DEBUG companyData length:', companyData.length);
    console.log('DEBUG dataSource:', dataSource);
    
    if (!message) {
      return res.json({ reply: 'Please send a message.', images: [] });
    }
    
    if (!companyData || companyData.trim() === '') {
      return res.json({ 
        reply: '⚠️ Please load a website or upload a file first before asking questions!', 
        images: [] 
      });
    }

    const lower = message.toLowerCase();
    const imageKeywords = ['image','photo','picture','logo','show','display','gallery','banner','icon','visual','graphic','thumbnail','poster'];
    const wantsImages = imageKeywords.some(w => lower.includes(w));

    if (wantsImages && companyImages.length > 0) {
      let filtered = [...companyImages];
      if (lower.includes('logo')) {
        const f = companyImages.filter(i => 
          (i.alt||'').toLowerCase().includes('logo') || 
          (i.src||'').toLowerCase().includes('logo'));
        if (f.length > 0) filtered = f;
      }
      return res.json({ 
        reply: 'Here are images from the website:', 
        images: filtered.slice(0, 6) 
      });
    }

    if (wantsImages && companyImages.length === 0) {
      return res.json({ 
        reply: dataSource === 'file' 
          ? 'This is a document file — no images available. Ask me about the text content!' 
          : 'No images were found on this website.',
        images: [] 
      });
    }

    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) {
      return res.json({ reply: '❌ Groq API key missing in backend/.env file!', images: [] });
    }

    const sourceLabel = dataSource === 'file' 
      ? 'document: ' + companyUrl 
      : 'website: ' + companyUrl;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { 
            role: 'system', 
            content: 'You are an intelligent and helpful company assistant. Always reply in English only. Be accurate, clear and concise. Only use the provided content to answer. If information is not in the content, say so honestly.' 
          },
          { 
            role: 'user', 
            content: 'You are answering questions about the following ' + sourceLabel + '\n\nContent:\n' + companyData.substring(0, 4000) + '\n\nUser Question: ' + message + '\n\nAnswer in English:' 
          }
        ],
        max_tokens: 700,
        temperature: 0.3
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const reply = data.choices[0].message.content;
      console.log('Groq reply:', reply.substring(0, 100));
      res.json({ reply, images: [] });
    } else {
      console.error('Groq error response:', JSON.stringify(data));
      res.json({ reply: '❌ Groq API error: ' + (data.error?.message || 'Unknown error'), images: [] });
    }
  } catch (err) {
    console.error('Chat error:', err.message);
    res.json({ reply: '❌ Server error: ' + err.message, images: [] });
  }
});

app.listen(PORT, () => {
  console.log('✅ Server running on port', PORT);
  console.log('🔑 Groq API Key:', process.env.GROQ_API_KEY ? 'Found ✅' : 'MISSING ❌');
});

