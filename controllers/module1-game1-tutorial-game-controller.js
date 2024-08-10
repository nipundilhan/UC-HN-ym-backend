const { verifyToken } = require('../middlewares/auth-middleware');
const express = require('express');
const studentTutorialService = require('../services/module1-game1-tutorial-game-service');

const router = express.Router();

router.post('/', addTutorial);
router.get('/findByStudent/:id', findTasksByStudentID);

// Controller method to handle protected route
async function addTutorial(req, res) {
    try {
        const tutorial = req.body;

        // Call service layer to handle user signup
        const newUser = await studentTutorialService.handleAddTutorial(tutorial);

        res.status(201).json(tutorial);
    } catch (error) {
        console.error('Error signing up user:', error);
        res.status(400).json({ message: error.message });
    }
}

async function findTasksByStudentID(req, res) {
    try {
        const studentId = req.params.id;
        const data = await studentTutorialService.findStudentTasksByStudentID(studentId);
        if (data) {
            res.status(200).json(data);
        } else {
            res.status(404).json({ message: 'student tasks not found' });
        }
    } catch (error) {
        console.error('Error updating country:', error);
        res.status(400).json({ message: error.message });
    }
}


module.exports = router;  