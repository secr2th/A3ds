import { CONFIG } from '../config.js';
class GeminiAPI {
  constructor() { this.apiKey = null; }
  setApiKey(k) { this.apiKey = k; }
  async generate(prompt) {
    if (!this.apiKey) throw new Error('API Key not set');
    const res = await fetch(CONFIG.GEMINI_API_ENDPOINT, { method: 'POST', headers: {'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey}, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }]}) });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }
}
export default new GeminiAPI();
