const jwt = require('jsonwebtoken');
const express = require('express');
const { JWT_SECRET } = require('../utils/jwt-utils');
const users = require('../models/user-model');
const router = express.Router();

router.post('/authenticate', authenticate); 

function authenticate(req, res) {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    

    res.json({  user : {username: user.username  , role : user.role }, jwtToken: token });
}



module.exports = router ;