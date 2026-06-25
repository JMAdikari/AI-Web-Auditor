const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logPromptExchange(data) {
  ensureLogDir();

  const filename = `audit_${Date.now()}.json`;
  const filepath = path.join(LOG_DIR, filename);

  const logEntry = {
    timestamp: data.timestamp,
    auditedUrl: data.url,
    model: data.model,
    performance: {
      latencyMs: data.latencyMs,
    },
    prompts: {
      system: data.systemPrompt,
      user: data.userPrompt,
    },
    rawModelOutput: data.rawOutput,
  };

  // Individual file for easy single-audit review
  fs.writeFileSync(filepath, JSON.stringify(logEntry, null, 2));

  // JSONL combined log allows grep across all historical audits
  const combinedPath = path.join(LOG_DIR, 'all_audits.jsonl');
  fs.appendFileSync(combinedPath, JSON.stringify(logEntry) + '\n');

  return filepath;
}

module.exports = { logPromptExchange };
