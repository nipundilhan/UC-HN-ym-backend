// controllers/module1-game3-QandA-controller.js
const express = require('express');
const router = express.Router();
const { handleGame3QandA , handleRateQandA , getGame3QandAData , getSharedQandAs , updateSharedStatus} = require('../services/module1-game3-QandA-service');

// Controller method to handle Game 3 QandA
router.post('/', async (req, res) => {
    try {
        const studentData = req.body;

        // Call service layer to handle adding/updating QandA
        const updatedStudentTask = await handleGame3QandA(studentData);

        res.status(201).json({ message: 'QandA processed successfully', updatedStudentTask });
    } catch (error) {
        console.error('Error processing QandA:', error);
        res.status(400).json({ message: error.message });
    }
});

router.post('/rate', async (req, res) => {
    try {
        const studentData = req.body;

        // Call service layer to handle the rating
        const updatedStudentTask = await handleRateQandA(studentData);

        res.status(200).json({ message: 'Rating processed successfully'});
    } catch (error) {
        console.error('Error processing rating:', error);
        res.status(400).json({ message: error.message });
    }
});



// Route to fetch Game 3 data for a specific student
router.get('/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        // Call the service to get the game3 data
        const game3Data = await getGame3QandAData(studentId);

        res.status(200).json({ message: 'Game3 data retrieved successfully', data: game3Data });
    } catch (error) {
        console.error('Error fetching Game3 data:', error);
        res.status(400).json({ message: error.message });
    }
});


router.get('/sharedQandA/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        // Call the service to get all shared QandAs
        const sharedQandAData = await getSharedQandAs(studentId);

        res.status(200).json({ message: 'Shared QandA data retrieved successfully', data: sharedQandAData });
    } catch (error) {
        console.error('Error fetching shared QandA data:', error);
        res.status(400).json({ message: error.message });
    }
});

router.put('/share', async (req, res) => {
    try {
        const { ownerStudentId, QandAId, sharedStatus } = req.body;

        // Call service layer to update the shared status
        const result = await updateSharedStatus({ ownerStudentId, QandAId, sharedStatus });

        res.status(200).json(result);
    } catch (error) {
        console.error('Error updating shared status:', error);
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;