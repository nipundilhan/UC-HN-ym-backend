const jwt = require('jsonwebtoken');
const express = require('express');
const { JWT_SECRET } = require('../utils/jwt-utils');
const connectDB = require('../config/db'); // Ensure the correct path
const router = express.Router();

router.post('/authenticate', authenticate); 

async function authenticate(req, res) {
    const { username, password } = req.body;

    try {
        const db = await connectDB();
        const collection = db.collection('users');

        // Find user by username and password
        const user = await collection.findOne({ username, password });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ user: { username: user.username, userId : user._id,  role: user.role }, jwtToken: token });
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}



module.exports = router ;