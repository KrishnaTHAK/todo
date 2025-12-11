const { Pool } = require('pg')

const pool = new Pool({
    user: 'project',
    password: 'krish',
    host: 'localhost',
    port:5432,
    database: 'todo_app'
});

module.exports = pool;