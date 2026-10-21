const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, 'data', 'hub.log');

function write(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  if (level === 'ERROR') console.error(line);
  else console.log(line);
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, line + '\n');
  } catch {
    // Logging to disk is best-effort - never let a logging failure break the request.
  }
}

module.exports = {
  info: (message) => write('INFO', message),
  warn: (message) => write('WARN', message),
  error: (message) => write('ERROR', message),
};
