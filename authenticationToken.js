const jwt = require('jsonwebtoken');

function authenticationToken (req, res, next) {
    const token = req.header('token');
    if (!token) {
        return res.status(401).send('Access denied: No token provided!');
    }
    try {
        const verified = jwt.verify(token, 'secret_key');
        req.user = verified;
        next()
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
}

module.exports = authenticationToken;
