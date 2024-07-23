const { verifyToken } = require('../middlewares/auth-middleware');
const express = require('express');

const router = express.Router();

router.get('/protected', verifyToken, protected);
router.get('/get-username', verifyToken, getUsername);


// Controller method to handle protected route
function protected(req, res) {
    // Authorization check (role-based access control)
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Access denied' });
    }
    res.json({ message: 'Protected route accessed successfully', username: req.user.username });
}

// Controller method to fetch username from JWT
function getUsername(req, res) {
    // we might not be able to get any other newly assign variables in decoded user object eg:- email
    res.json({ username: req.user.username });
}

module.exports = router;    