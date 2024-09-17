// services/student-mood-service.js
const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');

const { defineStudentTaskStructure } = require('../services/modules-service');



// Function to add or update mood based on provided date
async function addOrUpdateMood(studentData) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');

    const { _id, studentId, date, mood } = studentData;

    // Check if _id is provided to update an existing studentTask
    if (_id) {
        const studentTask = await collection.findOne({ _id: new ObjectId(_id) });

        if (studentTask) {
            // Check if the date already exists in moods array
            const existingMoodIndex = studentTask.moods.findIndex(moodItem => moodItem.date === date);

            if (existingMoodIndex > -1) {
                // If date exists, update the mood
                await collection.updateOne(
                    { _id: new ObjectId(_id), 'moods.date': date },
                    { $set: { 'moods.$.mood': mood } }
                );
            } else {
                // If date does not exist, push new mood into moods array
                await collection.updateOne(
                    { _id: new ObjectId(_id) },
                    { $push: { moods: { date, mood } } }
                );
            }
        } else {
            throw new Error("Student Task not found");
        }
    } else {
        // If no _id is provided, create a new studentTask document
        const newStudentTask = defineStudentTaskStructure(studentData);
        newStudentTask.moods.push({ date, mood }); // Add the mood
        const result = await collection.insertOne(newStudentTask);
        return result.insertedId;
    }
}

module.exports = { addOrUpdateMood };