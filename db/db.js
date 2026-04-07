const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '030508', 
    database: 'travel_agency',
    waitForConnections: true,
    connectionLimit: 10,
});

module.exports = pool;