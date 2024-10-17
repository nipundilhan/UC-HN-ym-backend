const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');
/*const { defineStudentTaskStructure } = require('../services/modules-service');*/


function defineStudentTaskStructure(studentData) {
    
    return {
        _id :  new ObjectId(),
        studentName: studentData.studentName || "",
        studentId: new ObjectId(studentData.studentId),
        moods: [],
        module1: {
            moduleCode: "MOD1",
            game1: {
                gameCode: "GM1",
                gamePoints: 0,
                tasks: [] // Tasks array will contain objects with the following structure:
                /*
                    Task Object Structure:
                    {
                        _id: new ObjectId(),        // ObjectId, unique identifier for the task
                        name: (String),             // Name of the task
                        description: (String),      // Description of the task
                        date: (Date),               // Date of task creation or completion
                        status: (String),           // Task status, e.g., 'completed', 'pending'
                        completePercentage: (Number),// Completion percentage (if relevant)
                        points: (Number)            // Points assigned based on task status
                    }
                */
            },            
            game2: {
                gameCode: "GM2",
                gamePoints: 1, // Initialize to 1 for the new entry
                mindMaps: []
            }
        }
    };
}


async function addMindMap(studentId, mindMapData) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');

    // Check if a record exists for this student
    let studentRecord = await collection.findOne({ studentId: new ObjectId(studentId) });

    // If no record exists, initialize a new record
    if (!studentRecord) {
        const newStudentTask = defineStudentTaskStructure({ studentId });
        studentRecord = await collection.insertOne(newStudentTask);
    }

    // Prepare the mind map object
    const mindMap = {
        _id: new ObjectId(),
        title: mindMapData.title,
        description: mindMapData.description,
        date: mindMapData.date,
        attachments: mindMapData.attachments.map(file => ({
            filename: file.originalname, // Save original filename
            contentType: file.mimetype, // Save content type
            data: file.buffer // Save the file as binary data
        })),
        points: 1 // Points for the new mind map
    };

    // Check if mindMapId is provided
    if (mindMapData.mindMapId) {
        // Update the existing mind map
        const updateResult = await collection.updateOne(
            { studentId: new ObjectId(studentId), "module1.game2.mindMaps._id": new ObjectId(mindMapData.mindMapId) },
            { $set: { "module1.game2.mindMaps.$": mindMap } } // Update mind map details
        );
        return updateResult;
    } else {
        // Push the new mind map into the existing array and increment gamePoints
        await collection.updateOne(
            { studentId: new ObjectId(studentId) },
            { 
                $push: { "module1.game2.mindMaps": mindMap },
                $inc: { "module1.game2.gamePoints": 1 } // Increment game points
            }
        );
    }
}


async function getGame2Details(studentId) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');

    // Find the student record by studentId
    const studentRecord = await collection.findOne({ studentId: new ObjectId(studentId) }, { projection: { "module1.game2": 1 } });

    if (!studentRecord) {
        return null; // Student not found
    }

    const game2Details = studentRecord.module1.game2;

    // Add a check for the mindMaps array to return attachments from the first object
    // if (game2Details && game2Details.mindMaps.length > 0) {
    //     const firstMindMap = game2Details.mindMaps[0];
    //     game2Details.attachments = firstMindMap.attachments; // Add attachments to the game2Details
    // }

    return game2Details;
}


module.exports = { addMindMap , getGame2Details};