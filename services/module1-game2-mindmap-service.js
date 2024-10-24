const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');
const { formatDate , defineStudentTaskStructure } = require('../services/modules-service');

// Define the structure of the mind map with attachment references
async function addMindMap(studentId, mindMapData) {
    const db = await connectDB();
    const studentCollection = db.collection('studentTasks');
    const attachmentCollection = db.collection('attachments');

    // Check if a record exists for this student
    let studentRecord = await studentCollection.findOne({ studentId: new ObjectId(studentId) });

    // If no record exists, initialize a new record
    if (!studentRecord) {
        const newStudentTask = defineStudentTaskStructure({ studentId });
        studentRecord = await studentCollection.insertOne(newStudentTask);
    }

    // Insert attachments into the attachments collection
    const attachmentRefs = [];
    for (const file of mindMapData.attachments) {
        const attachmentDoc = {
            filename: file.originalname,
            contentType: file.mimetype,
            data: file.buffer
        };
        const attachmentResult = await attachmentCollection.insertOne(attachmentDoc);
        attachmentRefs.push(attachmentResult.insertedId);
    }

    // Prepare the mind map object
    const mindMap = {
        _id: new ObjectId(),
        title: mindMapData.title,
        description: mindMapData.description,
        date: formatDate(new Date()), 
        attachments: attachmentRefs, // Store the ObjectIds of attachments
        sharedStatus: "NOT_SHARED",
        likes: [],
        points: 1 // Points for the new mind map
    };

    // Check if mindMapId is provided (for update)
    if (mindMapData.mindMapId) {
        // Fetch the current mind map to get the existing attachment references
        const currentMindMap = studentRecord.module1?.game2?.mindMaps?.find(map => map._id.equals(mindMapData.mindMapId));
        
        if (currentMindMap && currentMindMap.attachments) {
            // Delete the current attachments from the attachments collection
            await attachmentCollection.deleteMany({ _id: { $in: currentMindMap.attachments } });
        }

        const updateResult = await studentCollection.updateOne(
            { studentId: new ObjectId(studentId), "module1.game2.mindMaps._id": new ObjectId(mindMapData.mindMapId) },
            { $set: { "module1.game2.mindMaps.$": mindMap } }
        );
        return updateResult;
    } else {
        // Push the new mind map into the existing array and increment gamePoints
        await studentCollection.updateOne(
            { studentId: new ObjectId(studentId) },
            { 
                $push: { "module1.game2.mindMaps": mindMap },
                $inc: { "module1.game2.gamePoints": 1 } // Increment game points
            }
        );
    }
}

// Fetch game2 details and include attachments and like counts
async function getGame2Details(studentId) {
    const db = await connectDB();
    const studentCollection = db.collection('studentTasks');
    const attachmentCollection = db.collection('attachments');

    // Find the student record by studentId
    const studentRecord = await studentCollection.findOne(
        { studentId: new ObjectId(studentId) },
        { projection: { "module1.game2": 1 } }
    );

    if (!studentRecord) {
        return null; // Student not found
    }

    const game2Details = studentRecord.module1.game2;

    let totalLikesCount = 0;
    // Enrich each mindMap with its attachments and likes count
    for (const mindMap of game2Details.mindMaps) {
        // Fetch the actual attachments from the attachments collection
        const attachmentDocs = await attachmentCollection.find({ _id: { $in: mindMap.attachments } }).toArray();
        mindMap.attachments = attachmentDocs;

        // Add the likes count
        mindMap.likesCount = mindMap.likes ? mindMap.likes.length :0;
        totalLikesCount += mindMap.likesCount;
    }

    game2Details.totalLikesCount =totalLikesCount;
    return game2Details;
}

module.exports = { addMindMap, getGame2Details };

/*
const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');
const { defineStudentTaskStructure } = require('../services/modules-service');
const {  formatDate } = require('../services/modules-service');


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
        date: formatDate(new Date()), 
        attachments: mindMapData.attachments.map(file => ({
            filename: file.originalname, // Save original filename
            contentType: file.mimetype, // Save content type
            data: file.buffer // Save the file as binary data
        })),
        sharedStatus: "NOT_SHARED",
        likes: [],
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

*/