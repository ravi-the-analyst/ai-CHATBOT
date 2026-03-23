from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import openai
from groq import Groq

app = Flask(__name__)
CORS(app)

# Global storage for scraped data (in production use Redis/session)
scraped_chunks = []

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        print("User query:", data)

        user_msg = data.get("message")
        if not user_msg:
            return jsonify({"response": "Please type something!"})

        # RAG Pipeline - simple keyword search (replace with vector DB for production)
        if not scraped_chunks:
            return jsonify({"response": "Please load a website first."})

        # Simple semantic search (keyword + length)
        relevant_chunks = []
        for chunk in scraped_chunks:
            score = sum(1 for word in user_msg.lower().split() if word in chunk['text'].lower())
            if score > 0:
                relevant_chunks.append(chunk)
            if len(relevant_chunks) >= 3:
                break

        context = '\n\n'.join([c['text'] for c in relevant_chunks[:3]])
        print("Retrieved context length:", len(context))

        # LLM generation with Groq
        reply = generate_with_llm(user_msg, context)
        
        print("Final reply:", reply[:100] + '...')
        return jsonify({"response": reply})

    except Exception as e:
        print("Chat error:", str(e))
        return jsonify({"response": "Sorry, I couldn't find relevant information."})

def generate_with_llm(query, context):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    response = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {"role": "system", "content": "Answer using only the provided context. Use bullet points. English only."},
            {"role": "user", "content": f"Context:\n{context}\n\nQuery: {query}"}
        ],
        max_tokens=500,
        temperature=0.1
    )
    return response.choices[0].message.content.strip()

@app.route('/scrape', methods=['POST'])
def scrape():
    # Placeholder - integrate your scraper
    data = request.get_json()
    url = data.get("url")
    
    # Mock scraped data (replace with real scraper)
    scraped_chunks = [
        {"text": "Mock company data for testing. Courses, contact, location info."},
        {"text": "Company offers engineering courses with fees and admission details."}
    ]
    
    return jsonify({
        "success": True,
        "chunks": scraped_chunks
    })

if __name__ == "__main__":
    app.run(debug=True, port=3001)

