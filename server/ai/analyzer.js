const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildSystemPrompt, buildUserPrompt } = require('./promptBuilder');
const { logPromptExchange } = require('../logger/promptLogger');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeWithAI(metrics, content) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(metrics, content);

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
  });

  const startTime = Date.now();

  const result = await model.generateContent(userPrompt);
  const rawOutput = result.response.text();
  const elapsed = Date.now() - startTime;

  logPromptExchange({
    timestamp: new Date().toISOString(),
    url: metrics.url,
    systemPrompt,
    userPrompt,
    rawOutput,
    model: 'gemini-1.5-flash',
    latencyMs: elapsed,
  });

  let analysis;
  try {
    // Model sometimes wraps JSON in markdown code fences despite instructions
    const cleaned = rawOutput
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    analysis = JSON.parse(cleaned);
  } catch (parseError) {
    throw new Error(`AI returned invalid JSON: ${parseError.message}`);
  }

  return {
    analysis,
    meta: {
      model: 'gemini-1.5-flash',
      latencyMs: elapsed,
    },
  };
}

module.exports = { analyzeWithAI };
