const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildSystemPrompt, buildUserPrompt, buildComparisonPrompt } = require('./promptBuilder');
const { logPromptExchange } = require('../logger/promptLogger');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function parseJSON(raw) {
  // Model sometimes wraps JSON in markdown code fences despite instructions
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  return JSON.parse(cleaned);
}

async function analyzeWithAI(metrics, content) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(metrics, content);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
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
    model: 'gemini-2.5-flash',
    latencyMs: elapsed,
  });

  try {
    return {
      analysis: parseJSON(rawOutput),
      meta: { model: 'gemini-2.5-flash', latencyMs: elapsed },
    };
  } catch (parseError) {
    throw new Error(`AI returned invalid JSON: ${parseError.message}`);
  }
}

async function analyzeComparison(metrics1, metrics2, content1, content2) {
  const systemPrompt = buildSystemPrompt();
  const comparisonPrompt = buildComparisonPrompt(metrics1, metrics2, content1, content2);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  });

  const startTime = Date.now();
  const result = await model.generateContent(comparisonPrompt);
  const rawOutput = result.response.text();
  const elapsed = Date.now() - startTime;

  logPromptExchange({
    timestamp: new Date().toISOString(),
    url: `COMPARE: ${metrics1.url} vs ${metrics2.url}`,
    systemPrompt,
    userPrompt: comparisonPrompt,
    rawOutput,
    model: 'gemini-2.5-flash',
    latencyMs: elapsed,
  });

  try {
    return {
      comparison: parseJSON(rawOutput),
      meta: { model: 'gemini-2.5-flash', latencyMs: elapsed },
    };
  } catch (parseError) {
    throw new Error(`AI returned invalid JSON: ${parseError.message}`);
  }
}

module.exports = { analyzeWithAI, analyzeComparison };
