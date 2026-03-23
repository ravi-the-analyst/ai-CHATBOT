const { initRAG, splitChunks, embedChunks } = require('./rag');

async function buildRAG(text) {
  console.log('🧠 Building file RAG...');
  
  const model = await initRAG();
  const chunks = splitChunks(text);
  const embeddings = await embedChunks(model, chunks);
  
  global.documentText = text;
  global.fileRAG = { chunks, embeddings, model };
  
  console.log(`✅ File RAG ready: ${chunks.length} chunks (PDF mode)`);
}

module.exports = { buildRAG };

