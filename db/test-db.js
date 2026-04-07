const db = require('./db');

async function test() {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    console.log(rows);
}

test();