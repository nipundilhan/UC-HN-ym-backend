const { verifyToken } = require('../middlewares/auth-middleware');
const express = require('express');
const { handleUserSignup , updateStudent} = require('../services/user-service');

const router = express.Router();

router.get('/protected', verifyToken, protected);
router.get('/get-username', verifyToken, getUsername);
router.post('/signup', signup);
router.put('/update-student', verifyToken, updateStudentHandler); 


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

// Controller method for updating a student
async function updateStudentHandler(req, res) {
    try {
        const { _id, gender, dob, avatarCode } = req.body;

        if (!_id || !gender || !dob || !avatarCode) {
            return res.status(400).json({ message: "All fields (_id, gender, dob, avatarCode) are required." });
        }

        // Call the service layer to update the student
        const result = await updateStudent({ _id, gender, dob, avatarCode });

        res.status(200).json({ message: "Student updated successfully.", result });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(400).json({ message: error.message });
    }
}


module.exports = router;    