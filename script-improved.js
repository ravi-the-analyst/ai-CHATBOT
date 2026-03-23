const API_URL = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('scrapeBtn').onclick = scrapeWebsite;
  document.getElementById('uploadBtn').onclick = uploadFile;
  document.getElementById('userInput').onkeypress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };
  document.getElementById('themeToggle').onclick = toggleTheme;
});

async function scrapeWebsite() {
  const button = document.getElementById('scrapeBtn');
  const input = document.getElementById('urlInput');
  const url = input.value.trim();
  if (!url) return;

  button.textContent = 'Loading...';
  button.disabled = true;
  addBotMessage('🔄 Scanning website... please wait');

  try {
    const res = await fetch(`${API_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const data = await res.json();
    button.textContent = 'Load Website';
    button.disabled = false;
    
    if (data.success) {
      addBotMessage('✅ Website loaded! Ask me anything.');
      pollSummary();
    } else {
      addBotMessage('❌ Failed to load: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Scrape error:', error);
    button.textContent = 'Load Website';
    button.disabled = false;
    addBotMessage('❌ Connection error. Try again.');
  }
}

async function uploadFile() {
  const fileInput = document.getElementById('fileUpload');
  const file = fileInput.files[0];
  if (!file) {
    addBotMessage('⚠️ Please select a file first.');
    return;
  }

  const button = document.getElementById('uploadBtn');
  button.textContent = 'Uploading...';
  button.disabled = true;
  addBotMessage(`📄 Uploading and processing ${file.name}...`);

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    button.textContent = 'Upload File';
    button.disabled = false;
    fileInput.value = ''; // Clear input
    
    if (data.success) {
      addBotMessage('✅ File processed! Now ask questions about your file.');
    } else {
      addBotMessage('❌ Upload failed: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Upload error:', error);
    button.textContent = 'Upload File';
    button.disabled = false;
    addBotMessage('❌ Upload connection error. Try again.');
  }
}

// ... rest of functions unchanged (sendMessage, addBotMessage, etc.)
async function sendMessage() {
  const input = document.getElementById('userInput');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  addUserMessage(message);
  showTyping();

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    
    const data = await res.json();
    removeTyping();
    addBotMessage(data.reply || 'No response');
    
    if (data.images && data.images.length) {
      data.images.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.onerror = () => img.style.display = 'none';
        img.style.cssText = 'max-width:100%; border-radius:12px; margin:8px 0; display:block;';
        document.querySelector('.bot-row:last-child .bot-msg').appendChild(img);
      });
    }
    
    if (data.videos && data.videos.length) {
      data.videos.forEach(url => {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.onerror = () => video.style.display = 'none';
        video.style.cssText = 'max-width:100%; border-radius:12px; margin:8px 0; display:block;';
        document.querySelector('.bot-row:last-child .bot-msg').appendChild(video);
      });
    }
  } catch (e) {
    removeTyping();
    addBotMessage('❌ Connection error. Try again.');
  }
}

function addBotMessage(text) {
  removeTyping();
  const chatBox = document.getElementById('chatBox');
  const row = document.createElement('div');
  row.className = 'bot-row';
  row.innerHTML = `
    🤖
    <div class="bot-msg">${text}</div>
  `;
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addUserMessage(text) {
  const chatBox = document.getElementById('chatBox');
  const row = document.createElement('div');
  row.className = 'user-row';
  row.innerHTML = `<div class="user-msg">${text}</div>`;
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
  const chatBox = document.getElementById('chatBox');
  const row = document.createElement('div');
  row.className = 'bot-row';
  row.id = 'typing-row';
  row.innerHTML = `
    🤖
    <div class="bot-msg typing">Typing...</div>
  `;
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTyping() {
  const row = document.getElementById('typing-row');
  if (row) row.remove();
}

function pollSummary() {
  clearSuggestedQuestions();
  let timeoutCount = 0;
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${API_URL}/summary`);
      const data = await res.json();
      if (data.questions && data.questions.length) {
        clearInterval(interval);
        showSuggestedQuestions(data.questions);
      }
    } catch (e) {}
    if (++timeoutCount > 8) clearInterval(interval);
  }, 1000);
}

function clearSuggestedQuestions() {
  document.getElementById('suggestedQuestions').innerHTML = '';
}

function showSuggestedQuestions(questions) {
  const container = document.getElementById('suggestedQuestions');
  questions.slice(0, 6).forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'suggested-btn';
    btn.textContent = q;
    btn.onclick = () => {
      document.getElementById('userInput').value = q;
      sendMessage();
    };
    container.appendChild(btn);
  });
}

function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const btn = document.getElementById('themeToggle');
  btn.innerText = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
}
