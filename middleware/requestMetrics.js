const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

const requestEvents = require('../events/requestEvents');

const requestsByIp = new Map();

function pruneExpiredRequests(timestamps, now) {
  return timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
}

function requestMetrics(req, res, next) {
  const startTime = process.hrtime();
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const recentRequests = pruneExpiredRequests(requestsByIp.get(ip) || [], now);

 
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    const err = new Error('Too Many Requests');
    err.status = 429;

    requestEvents.emit('rateLimitExceeded', {
      eventType: 'rateLimitExceeded',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      ip,
      statusCode: 429,
      rateLimit: {
        windowMs: WINDOW_MS,
        maxRequests: MAX_REQUESTS_PER_WINDOW
      }
    });

    return next(err); 
  }

  recentRequests.push(now);
  requestsByIp.set(ip, recentRequests);

  const originalWriteHead = res.writeHead;

  res.writeHead = function (...args) {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      const diff = process.hrtime(startTime);
      const responseTimeMs = (diff[0] * 1e3) + (diff[1] / 1e6);
      res.setHeader('X-Response-Time', `${responseTimeMs.toFixed(3)}ms`);
    }
    return originalWriteHead.apply(this, args);
  };

  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      const diff = process.hrtime(startTime);
      const responseTimeMs = (diff[0] * 1e3) + (diff[1] / 1e6);

      requestEvents.emit('requestCompleted', {
        eventType: 'requestCompleted',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        ip,
        statusCode: res.statusCode,
        responseTimeMs: Number(responseTimeMs.toFixed(3))
      });
    }

    const timestamps = requestsByIp.get(ip);
    if (!timestamps) return;

    const active = pruneExpiredRequests(timestamps, Date.now());

    if (active.length === 0) {
      requestsByIp.delete(ip);
    } else {
      requestsByIp.set(ip, active);
    }
  });

  next();
}

module.exports = requestMetrics;