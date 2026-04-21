const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

function clearModule(modulePath) {
  delete require.cache[require.resolve(modulePath)];
}

function loadFreshApp(mockQuery) {
  const modulesToClear = [
    '../app',
    '../db/db',
    '../routes/index',
    '../routes/users',
    '../routes/tours',
    '../middleware/requestMetrics',
    '../middleware/requestStats',
    '../events/requestEvents',
    '../subscribers/requestSubscriber'
  ];

  modulesToClear.forEach(clearModule);

  const dbModulePath = require.resolve('../db/db');
  require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
      query: mockQuery
    }
  };

  return require('../app');
}

async function startServer(mockQuery) {
  const logFilePath = path.join(__dirname, '..', 'logs', 'request-stats.json');

  if (fs.existsSync(logFilePath)) {
    fs.unlinkSync(logFilePath);
  }

  const app = loadFreshApp(mockQuery);
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));

  const port = server.address().port;

  async function request(requestPath, options = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: requestPath,
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let rawBody = '';

        res.on('data', (chunk) => {
          rawBody += chunk;
        });

        res.on('end', () => {
          let jsonBody = null;

          if (rawBody) {
            try {
              jsonBody = JSON.parse(rawBody);
            } catch (error) {
              jsonBody = null;
            }
          }

          resolve({
            status: res.statusCode,
            headers: {
              get(headerName) {
                return res.headers[String(headerName).toLowerCase()] || null;
              }
            },
            text: rawBody,
            json: jsonBody
          });
        });
      });

      req.on('error', reject);

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  return {
    request,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    })
  };
}

test('GET / returns the home page', async () => {
  const server = await startServer(async () => {
    throw new Error('Database should not be called');
  });

  try {
    const response = await server.request('/');

    assert.equal(response.status, 200);
    assert.match(response.text, /Express/);
    assert.ok(response.headers.get('x-response-time'));
  } finally {
    await server.close();
  }
});

test('GET /users returns JSON payload', async () => {
  const server = await startServer(async () => {
    throw new Error('Database should not be called');
  });

  try {
    const response = await server.request('/users');

    assert.equal(response.status, 200);
    assert.deepEqual(response.json, {
      message: 'Users endpoint is working',
      success: true
    });
    assert.ok(response.headers.get('x-response-time'));
  } finally {
    await server.close();
  }
});

test('GET /tours returns all tours', async () => {
  const tours = [{ tour_id: 1, hotel_id: 10, duration_weeks: 2, base_price: 500 }];
  const server = await startServer(async (sql) => {
    assert.equal(sql, 'SELECT * FROM tours');
    return [tours];
  });

  try {
    const response = await server.request('/tours');

    assert.equal(response.status, 200);
    assert.deepEqual(response.json, tours);
  } finally {
    await server.close();
  }
});

test('GET /tours/:id returns a single tour', async () => {
  const server = await startServer(async (sql, params) => {
    assert.equal(sql, 'SELECT * FROM tours WHERE tour_id = ?');
    assert.deepEqual(params, ['7']);
    return [[{ tour_id: 7, hotel_id: 2, duration_weeks: 1, base_price: 300 }]];
  });

  try {
    const response = await server.request('/tours/7');

    assert.equal(response.status, 200);
    assert.deepEqual(response.json, {
      tour_id: 7,
      hotel_id: 2,
      duration_weeks: 1,
      base_price: 300
    });
  } finally {
    await server.close();
  }
});

test('GET /tours/:id returns 404 when a tour does not exist', async () => {
  const server = await startServer(async () => [[]]);

  try {
    const response = await server.request('/tours/404');

    assert.equal(response.status, 404);
    assert.equal(response.text, 'Tour not found');
    assert.equal(response.headers.get('x-response-time'), null);
  } finally {
    await server.close();
  }
});

test('POST /tours creates a new tour', async () => {
  const server = await startServer(async (sql, params) => {
    assert.equal(
      sql,
      'INSERT INTO tours (hotel_id, duration_weeks, base_price) VALUES (?, ?, ?)'
    );
    assert.deepEqual(params, [3, 2, 900]);
    return [{ insertId: 15 }];
  });

  try {
    const response = await server.request('/tours', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hotel_id: 3,
        duration_weeks: 2,
        base_price: 900
      })
    });

    assert.equal(response.status, 201);
    assert.deepEqual(response.json, {
      message: 'Tour created',
      id: 15
    });
    assert.ok(response.headers.get('x-response-time'));
  } finally {
    await server.close();
  }
});

test('POST /tours validates required fields', async () => {
  const server = await startServer(async () => {
    throw new Error('Database should not be called');
  });

  try {
    const response = await server.request('/tours', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hotel_id: 3
      })
    });

    assert.equal(response.status, 400);
    assert.equal(response.text, 'Missing fields');
    assert.equal(response.headers.get('x-response-time'), null);
  } finally {
    await server.close();
  }
});

test('DELETE /:id removes a tour', async () => {
  const server = await startServer(async (sql, params) => {
    assert.equal(sql, 'DELETE FROM tours WHERE tour_id = ?');
    assert.deepEqual(params, ['8']);
    return [{ affectedRows: 1 }];
  });

  try {
    const response = await server.request('/tours/8', {
      method: 'DELETE'
    });

    assert.equal(response.status, 204);
    assert.ok(response.headers.get('x-response-time'));
  } finally {
    await server.close();
  }
});

test('DELETE /tours/:id returns 404 when nothing is deleted', async () => {
  const server = await startServer(async () => [{ affectedRows: 0 }]);

  try {
    const response = await server.request('/tours/8', {
      method: 'DELETE'
    });

    assert.equal(response.status, 404);
    assert.equal(response.text, 'Tour not found');
    assert.equal(response.headers.get('x-response-time'), null);
  } finally {
    await server.close();
  }
});
