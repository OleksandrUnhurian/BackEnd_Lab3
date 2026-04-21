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
  try {
    ensureLogFile();

    let parsedContent = [];

    function appendEventToFile(eventPayload) {
  ensureLogFile();

  fs.appendFileSync(
    logFilePath,
    JSON.stringify(eventPayload) + "\n",
    'utf8'
  );
}
  } catch (err) {
    console.error("FILE WRITE ERROR:", err.message);
  }
}

function printToConsole(eventPayload) {
  console.log("\n==============================");
  console.log("EVENT:", eventPayload.eventType);
  console.log("Time:", eventPayload.timestamp);
  console.log("Method:", eventPayload.method);
  console.log("Path:", eventPayload.path);
  console.log("IP:", eventPayload.ip || eventPayload.routeParams);
  console.log("Status:", eventPayload.statusCode);

  if (eventPayload.responseTimeMs) {
    console.log("Response time:", eventPayload.responseTimeMs + "ms");
  }

  if (eventPayload.rateLimit) {
    console.log("RATE LIMIT INFO:", eventPayload.rateLimit);
  }

  console.log("==============================\n");
}

function handleEvent(eventPayload) {
  printToConsole(eventPayload); 
  appendEventToFile(eventPayload);
}

requestEvents.on('requestObserved', handleEvent);
requestEvents.on('requestCompleted', handleEvent);
requestEvents.on('rateLimitExceeded', handleEvent);

module.exports = {
  logFilePath
};