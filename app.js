const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const authenticationToken = require('./authenticationToken.js')

const app = express()

//  setup static and middleware
app.use(express.static('./public'))
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile('index.html')
})

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        // encrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);
        // save to db
        const newUser = await db.query(`
            INSERT INTO users (username,password) VALUES ($1, $2) RETURNING *`,
            [username, hashedPass]
        );

        // generates a token so they are logged in immediately.
        const token = jwt.sign(
            { user_id: newUser.rows[0].user_id },
            'secret_key',
            { expiresIn: '1hr' }
        );
        res.json({ email: newUser.rows[0].username, token });
    }
    catch (err) {
        console.error(err.message);
        if (err.code === '23505') {
            return res.status(400).json({ 'detail': 'User already exists!' });
        }
        res.status(500).send('Server Error');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // 1. check if user exists
        const users = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (users.rows.length === 0) {
            return res.status(401).send('Password or Email is incorrect!');
        }
        // 2. check if pass matches the hash
        const validPass = await bcrypt.compare(password, users.rows[0].password);
        if (!validPass) {
            return res.status(401).send('Password or Email is incorrect!');
        }
        // 3. Give them a token
        const token = jwt.sign(
            { 'user_id': users.rows[0].user_id },
            'secret_key',
            {expiresIn: '1hr'}
        );
        res.json({ token });
    }
    catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/test-db', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json(result.rows[0]);
    } catch (err) {
        console.log(err)
        res.status(500).send('Database connection error');
    }
});

app.post('/todos', authenticationToken, async (req, res) => {
    try {
        const { task, task_completed } = req.body;
        
        const user_id = req.user.user_id;
        const newTodo = await db.query(
            'INSERT INTO todos (task, task_completed, user_id) VALUES ($1, $2, $3) RETURNING *',
            [task, task_completed, user_id]
        );
        res.json(newTodo.rows[0])
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Database connection error')
    }
});

app.get('/todos', authenticationToken, async (req, res) => {
    try {
        const myTodos = await db.query(
            `SELECT * FROM todos WHERE user_id = $1`,
            [req.user.user_id]
        );
        res.json(myTodos.rows);
    } catch (err) {
        console.error(err.message);
    }
});

app.put('/todos/:id', authenticationToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { task } = req.body;

        const updateTodo = await db.query('UPDATE todos SET task = $1 WHERE id = $2 AND user_id = $3',
            [task, id, req.user.user_id]
        );

        res.json('todo was updated!')
    } catch (err) {
        console.error(err.message)
    }
})

app.delete('/todos/:id', authenticationToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deleteTodo = await db.query('DELETE FROM todos where id = $1 AND user_id = $2',
            [id, req.user.user_id]
        );
        if (deleteTodo.rowCount === 0) {
            return res.status(401).json('Not authorized of TODO not found!');
        }
        res.json('Todo was deleted!')
    } catch (err) {
        console.error(err);
    }
})

app.use((req, res) => {
    res.status(401).send('<h1>Page Not Found!</h1>')
})


app.listen(3000, () => {
    console.log('Server listening at PORT : 3000');
});