//should install jsonwebtoken , command - npm install jsonwebtoken
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/jwt-utils');

function verifyToken(req, res, next) {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
}

module.exports = {
    verifyToken
};