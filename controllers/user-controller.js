const { verifyToken } = require('../middlewares/auth-middleware');
const express = require('express');
const { handleUserSignup } = require('../services/user-service');

const router = express.Router();

router.get('/protected', verifyToken, protected);
router.get('/get-username', verifyToken, getUsername);
router.post('/signup', signup);


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


async function signup(req, res) {
    try {
        const userDetails = req.body;

        // Call service layer to handle user signup
        const newUser = await handleUserSignup(userDetails);

        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error signing up user:', error);
        res.status(400).json({ message: error.message });
    }
}


module.exports = router;    