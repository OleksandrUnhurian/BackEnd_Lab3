const fs = require('fs');
const path = require('path');
const requestEvents = require('../events/requestEvents');

const logDirectory = path.join(__dirname, '..', 'logs');
const logFilePath = path.join(logDirectory, 'request-stats.json');

function ensureLogFile() {
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
  }

  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '[]', 'utf8');
  }
}

function appendEventToFile(eventPayload) {
  ensureLogFile();

  const fileContent = fs.readFileSync(logFilePath, 'utf8');
  const parsedContent = JSON.parse(fileContent);

  parsedContent.push(eventPayload);

  fs.writeFileSync(logFilePath, JSON.stringify(parsedContent, null, 2), 'utf8');
}

function handleEvent(eventPayload) {
  appendEventToFile(eventPayload);
}

requestEvents.on('requestObserved', handleEvent);
requestEvents.on('requestCompleted', handleEvent);
requestEvents.on('rateLimitExceeded', handleEvent);

module.exports = {
  logFilePath
};
