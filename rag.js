const { pipeline, env } = require('@xenova/transformers');

// Onnx runtime web thread count (for Node)
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Global cache
let model = null;
let chunks = [];
let embeddings = null;

async function initRAG() {
  if (model) return model;
  
  console.log('Loading MiniLM embedding model...');
  model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('✅ RAG model ready');
  return model;
}

function splitChunks(text, chunkSize = 250, overlap = 50) {
  const sentences = text.split(/[.!?]\s+/);
  const chunks = [];
  
  for (let i = 0; i < sentences.length; i += chunkSize) {
    let chunk = sentences.slice(i, i + chunkSize).join(' ');
    if (chunk.length > 100) {
      chunks.push(chunk.trim());
    }
  }
  
  console.log(`📄 Split into ${chunks.length} chunks`);
  return chunks;
}

async function embedChunks(model, chunks) {
  const embeddings = [];
  
  for (let i = 0; i < chunks.length; i += 4) { // Batch
    const batch = chunks.slice(i, i + 4);
    const outputs = await model(batch, { pooling: 'mean', normalize: true });
    outputs.data.forEach((emb, idx) => {
      embeddings.push(Array.from(emb));
    });
  }
  
  console.log(`🔢 Generated ${embeddings.length} embeddings`);
  return embeddings;
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0, magA = 0, magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;

  return dot / (magA * magB);
}

async function getRelevantChunks(question, topK = 3) {
  if (!global.ragData || global.ragData.chunks.length === 0 || !global.ragData.embeddings?.length) {
    console.log('No RAG data - fallback');
    return [{ text: "No relevant data found from website.", score: 1 }]; 
  }
  const { chunks, embeddings, model } = global.ragData;

  try {
    const questionEmb = await model([question], { pooling: 'mean', normalize: true });
    const qVec = Array.from(questionEmb.data[0]);
    
    // Robust NaN/inf fix + fallback to keyword if embedding bad
    let validVec = qVec.map(v => isNaN(v) || !isFinite(v) ? 0 : v);
    if (validVec.every(v => v === 0)) {
      console.log('Invalid query embedding (NaN/inf) - keyword fallback');
      // Keyword fallback
      const lowerQ = question.toLowerCase();
      const scores = chunks.map((chunk, i) => ({
        idx: i,
        score: chunk.toLowerCase().includes(lowerQ.split(' ')[0]) ? 0.8 : 0
      })).slice(0, topK);
      return scores.map(s => ({ text: chunks[s.idx], score: s.score.toFixed(3) }));
    }
    
    const scores = embeddings.map((emb, i) => {
      const score = cosineSimilarity(qVec, emb);
      return { idx: i, score };
    }).sort((a, b) => b.score - a.score).slice(0, topK);
    
    const relevant = scores.map(s => ({
      text: chunks[s.idx],
      score: s.score.toFixed(3)
    }));
    
    console.log(`🎯 Top ${topK} chunks: ${scores.map(s => s.score.toFixed(3)).join(', ')}`);
    return relevant;
  } catch (e) {
    console.log('RAG search error:', e.message);
    return [{ text: chunks[0] || "Data available.", score: 1 }];
  }
}

module.exports = {
  initRAG,
  splitChunks,
  embedChunks,
  getRelevantChunks
};
