const requestEvents = require('../events/requestEvents');

const SENSITIVE_KEYS = ['password', 'token', 'email'];

function isSensitiveKey(key) {
  const normalizedKey = String(key).toLowerCase();
  return SENSITIVE_KEYS.some(k => normalizedKey.includes(k));
}

function obfuscateValues(source) {
  return Object.entries(source || {}).reduce((result, [key, value]) => {
    result[key] = isSensitiveKey(key) ? '***' : value;
    return result;
  }, {});
}

function requestStats(req, res, next) {
  res.on('finish', () => {
    requestEvents.emit('requestObserved', {
      eventType: 'requestObserved',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      routeParams: obfuscateValues(res.locals.routeParams || req.params),
      queryParams: obfuscateValues(req.query),
      userAgent: req.get('User-Agent') || 'unknown',
      statusCode: res.statusCode
    });
  });

  next();
}

module.exports = requestStats;