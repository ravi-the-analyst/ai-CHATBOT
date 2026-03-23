const API_URL = 'http://localhost:5000';
let currentMode = 'file'; // track current mode

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', newTheme);
  window.dispatchEvent(new Event('themeChanged'));
}

function clearChat() {
  const chatbox = document.getElementById('chatbox');
  chatbox.innerHTML = '';
  addMessage('👋 Hi! Load a website or file first, then ask me anything!', 'bot');
}

function switchMode(mode) {
  currentMode = mode;
  clearChat();

  const websiteDiv = document.getElementById('websiteMode');
  const fileDiv    = document.getElementById('fileMode');
  const webBtn     = document.getElementById('websiteModeBtn');
  const fileBtn    = document.getElementById('fileModeBtn');
  const input      = document.getElementById('userInput');

  if (mode === 'website') {
    if (websiteDiv) websiteDiv.style.display = 'block';
    if (fileDiv)    fileDiv.style.display    = 'none';
    if (webBtn)     webBtn.classList.add('active');
    if (fileBtn)    fileBtn.classList.remove('active');
    if (input)      input.placeholder = 'Ask about the website...';
  } else {
    if (websiteDiv) websiteDiv.style.display = 'none';
    if (fileDiv)    fileDiv.style.display    = 'block';
    if (fileBtn)    fileBtn.classList.add('active');
    if (webBtn)     webBtn.classList.remove('active');
    if (input)      input.placeholder = 'Ask about the uploaded file...';
  }
}

async function scrapeWebsite() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url || !url.startsWith('http')) {
    showStatus('scrapeStatus', '⚠️ Please enter a valid URL starting with http:// or https://', 'error');
    return;
  }
  
  const btn = document.getElementById('scrapeBtn');
  btn.disabled = true;
  showStatus('scrapeStatus', '⏳ Scraping website...', 'loading');
  
  try {
    const res = await fetch(`${API_URL}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    
    if (data.success === true) {
      showStatus('scrapeStatus', `✅ Success! ${data.imagesFound || 0} images found.`, 'success');
      addMessage(`✅ Website scraped successfully! Found ${data.imagesFound || 0} images. Ask me anything!`, 'bot');
    } else {
      showStatus('scrapeStatus', `❌ ${data.error || 'Scraping failed'}`, 'error');
    }
  } catch (error) {
    showStatus('scrapeStatus', '❌ Network error. Is server running on port 5000?', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function uploadFile() {
  // Lock mode to file — prevent any switching
  currentMode = 'file';

  const fileInput = document.getElementById('fileInput');
  const file      = fileInput ? fileInput.files[0] : null;

  if (!file) {
    showStatus('fileStatus', '⚠️ Please select a file!', 'error');
    return;
  }

  // Update display box
  const display = document.getElementById('fileDisplay');
  if (display) {
    display.textContent = '📄 ' + file.name;
    display.classList.add('has-file');
  }

  showStatus('fileStatus', '⏳ Uploading ' + file.name + '...', 'loading');

  const fd = new FormData();
  fd.append('file', file);

  try {
    const res  = await fetch(API_URL + '/upload', {
      method: 'POST',
      body:   fd
    });
    const data = await res.json();

    if (data.success) {
      showStatus('fileStatus',
        '✅ ' + file.name + ' loaded! (' + data.characters + ' chars)',
        'success'
      );
      addMessage(
        '✅ File "' + file.name + '" loaded! Ask me anything about it.',
        'bot'
      );
    } else {
      showStatus('fileStatus', '❌ ' + (data.error || 'Upload failed'), 'error');
    }

  } catch (err) {
    showStatus('fileStatus', '❌ ' + err.message, 'error');
  }

  // Force stay in file mode — runs after everything
  document.getElementById('websiteMode').style.display = 'none';
  document.getElementById('fileMode').style.display    = 'block';
  document.getElementById('fileModeBtn').classList.add('active');
  document.getElementById('websiteModeBtn').classList.remove('active');
  document.getElementById('userInput').placeholder = 'Ask about the uploaded file...';
}

async function sendMessage() {
  const msg = document.getElementById('userInput').value.trim();
  if (!msg) return;
  
  addMessage(msg, 'user');
  document.getElementById('userInput').value = '';
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message typing';
  typingDiv.id = 'typingIndicator';
  typingDiv.textContent = '🤖 Thinking...';
  document.getElementById('chatbox').appendChild(typingDiv);
  
  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    
    document.getElementById('typingIndicator').remove();
    
    if (data.reply) {
      addMessage(data.reply, 'bot');
      if (data.images && data.images.length > 0) {
        addImages(data.images);
      }
    }
  } catch (error) {
    document.getElementById('typingIndicator').remove();
    addMessage('❌ Server error. Is it running on port 5000?', 'bot');
  }
}

function addImages(images) {
  const chatbox = document.getElementById('chatbox');
  const div = document.createElement('div');
  div.className = 'message bot';
  
  const grid = document.createElement('div');
  grid.className = 'image-grid';
  
  images.forEach(img => {
    const image = document.createElement('img');
    image.src = img.src;
    image.alt = img.alt || '';
    grid.appendChild(image);
  });
  
  div.appendChild(grid);
  chatbox.appendChild(div);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function addMessage(text, sender) {
  const chatbox = document.getElementById('chatbox');
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.textContent = text;
  chatbox.appendChild(div);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function showStatus(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `status ${type}`;
}

function handleKey(e) {
  if (e.key === 'Enter') sendMessage();
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const isDark = saved === 'dark';
  document.getElementById('themeIcon').textContent = isDark ? '🌙' : '☀️';
});

window.addEventListener('load', () => {
  fetch(`${API_URL}/`)
    .then(r => r.json())
    .then(d => console.log('Server:', d))
    .catch(() => console.warn('Server not running on port 5000!'));
});
