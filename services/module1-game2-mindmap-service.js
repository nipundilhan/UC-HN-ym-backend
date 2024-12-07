const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');
const { formatDate , defineStudentTaskStructure } = require('../services/modules-service');
const {  getByUserName } = require('../services/user-service');

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
            {         
                $set: { 
                "module1.game2.mindMaps.$.title": mindMapData.title,
                "module1.game2.mindMaps.$.description": mindMapData.description,
                "module1.game2.mindMaps.$.attachments": attachmentRefs
                }
            }
        );
        return updateResult;
    } else {

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

async function updateSharedStatus(data) {
    const { ownerStudentId, mindMapId, sharedStatus } = data;

    const db = await connectDB();
    const collection = db.collection('studentTasks');

    // Find the student task using ownerStudentId
    const studentTask = await collection.findOne({ studentId: new ObjectId(ownerStudentId) });

    if (!studentTask) {
        throw new Error('Student task not found');
    }

    // Find the specific QandA element
    const game2 = studentTask.module1.game2;
    const qAndAIndex = game2.mindMaps.findIndex(q => q._id.equals(new ObjectId(mindMapId)));

    if (qAndAIndex === -1) {
        throw new Error('QandA not found');
    }

    // Update the sharedStatus
    game2.mindMaps[qAndAIndex].sharedStatus = sharedStatus;

    // Update the student task in the database
    await collection.updateOne(
        { studentId: new ObjectId(ownerStudentId), 'module1.game2.mindMaps._id': new ObjectId(mindMapId) },
        { $set: { 'module1.game2.mindMaps.$.sharedStatus': sharedStatus } }
    );

    return {
        message: 'Shared status updated successfully',
        updatedQandA: game2.mindMaps[qAndAIndex]
    };
}



async function getSharedMindMapsForAdmin() {
    const db = await connectDB();
    const collection = db.collection('studentTasks');
    const attachmentCollection = db.collection('attachments');

    // Fetch all student tasks that contain shared QandAs
    const sharedTasks = await collection.find({ "module1.game2.mindMaps.sharedStatus": { $in: ["SHARED", "HIDE"] } }).toArray();

    let sharedQandAs = [];

    // Loop through all student tasks using for...of
    for (const studentTask of sharedTasks) {
        const game2 = studentTask.module1.game2;

        // Fetch the user data for each studentTask
        const stdnt = await getUserByIdLocal(studentTask.studentId);

        // Loop through the QandA array and filter shared QandAs
        for (const qAndA of game2.mindMaps) {
            if (qAndA.sharedStatus === "SHARED"  || qAndA.sharedStatus === "HIDE") {
                const likesCount = qAndA.likes ? qAndA.likes.length : 0;



                const attachmentDocs = await attachmentCollection.find({ _id: { $in: qAndA.attachments } }).toArray();
                attachments = attachmentDocs;

                sharedQandAs.push({
                    _id: qAndA._id,
                    ownerStudentId: studentTask.studentId,
                    ownerStudentName: stdnt.username, 
                    ownerAvatarCode : stdnt.avatarCode,
                    title: qAndA.title,
                    description: qAndA.description,
                    date: qAndA.date,
                    sharedStatus: qAndA.sharedStatus,
                    likesCount,
                    attachments : attachmentDocs,
                    points: qAndA.points
                });
            }
        }
    }

    // Sort the filtered shared QandAs by date
    //sharedQandAs.sort((a, b) => new Date(b.date) - new Date(a.date));

    sharedQandAs.sort((a, b) => {
        // Convert the date strings back to Date objects for comparison
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Sort in descending order (most recent first)
    });

    // Now apply the skip and limit after filtering and sorting
    const limitedQandAs = sharedQandAs.slice(0, 102); // Skip the first 0, limit to the next 1000

    return {
        mindMaps: limitedQandAs
    };
}


async function getSharedMindMaps(studentId) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');
    const attachmentCollection = db.collection('attachments');

    // Fetch all student tasks that contain shared QandAs
    const sharedTasks = await collection.find({ "module1.game2.mindMaps.sharedStatus": "SHARED" }).toArray();

    let sharedQandAs = [];

    // Loop through all student tasks using for...of
    for (const studentTask of sharedTasks) {
        const game2 = studentTask.module1.game2;

        // Fetch the user data for each studentTask
        const stdnt = await getUserByIdLocal(studentTask.studentId);

        // Loop through the QandA array and filter shared QandAs
        for (const qAndA of game2.mindMaps) {
            if (qAndA.sharedStatus === "SHARED") {
                const likesCount = qAndA.likes ? qAndA.likes.length : 0;

                // Determine the 'liked' field based on the input studentId
                let liked;
                if (qAndA.likes.includes(studentId)) {
                    liked = "YES";
                } else if (studentTask.studentId.equals(studentId)) {
                    liked = "UNABLED";
                } else {
                    liked = "NO";
                }

                const attachmentDocs = await attachmentCollection.find({ _id: { $in: qAndA.attachments } }).toArray();
                attachments = attachmentDocs;

                sharedQandAs.push({
                    _id: qAndA._id,
                    // ownerStudentId: studentTask.studentId,
                    ownerStudentName: stdnt.username, 
                    ownerAvatarCode : stdnt.avatarCode,
                    title: qAndA.title,
                    description: qAndA.description,
                    date: qAndA.date,
                    sharedStatus: qAndA.sharedStatus,
                    likesCount,
                    liked,
                    attachments : attachmentDocs,
                    points: qAndA.points
                });
            }
        }
    }

    // Sort the filtered shared QandAs by date
    //sharedQandAs.sort((a, b) => new Date(b.date) - new Date(a.date));

    sharedQandAs.sort((a, b) => {
        // Convert the date strings back to Date objects for comparison
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Sort in descending order (most recent first)
    });

    // Now apply the skip and limit after filtering and sorting
    const limitedQandAs = sharedQandAs.slice(0, 102); // Skip the first 0, limit to the next 1000

    return {
        mindMaps: limitedQandAs
    };
}

async function getUserByIdLocal(id) {
    const db = await connectDB();
    const collection = db.collection('users');

    try {
        const user = await collection.findOne({ _id: new ObjectId(id) });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    } catch (error) {
        throw new Error(`Error fetching user: ${error.message}`);
    }
}


async function handleGame3QandA(studentData) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');

    const { studentId, QandAId, type, lessonTitle, question, answer } = studentData;

    // Check if the student record exists
    let studentTask = await collection.findOne({ studentId: new ObjectId(studentId) });

    const newQandA = {
        _id: new ObjectId(),
        type,
        lessonTitle,
        question,
        answer,
        date: formatDate(new Date()), 
        sharedStatus: "NOT_SHARED",
        likes: [],
        points: 1
    };

    if (!studentTask) {
        // No student task exists, create new one with empty QandA array
        studentTask = defineStudentTaskStructure(studentData);

        studentTask.module1.game3.QandA.push(newQandA);
        studentTask.module1.game3.gamePoints = 1;

        // Insert new student task record
        await collection.insertOne(studentTask);
    } else {
        // Student task exists, update or insert QandA
        const game3 = studentTask.module1.game3;

        if (!QandAId) {
            // No QandAId, so create new QandA

            game3.QandA.push(newQandA);
            game3.gamePoints += 1;
        } else {
            // QandAId exists, so update existing QandA
            const qAndAIndex = game3.QandA.findIndex(q => q._id.equals(QandAId));
            if (qAndAIndex > -1) {
                game3.QandA[qAndAIndex].type = type;
                game3.QandA[qAndAIndex].lessonTitle = lessonTitle;
                game3.QandA[qAndAIndex].question = question;
                game3.QandA[qAndAIndex].answer = answer;
            }
        }

        // Update the student task record
        await collection.updateOne({ studentId: new ObjectId(studentId) }, { $set: { module1: studentTask.module1 } });
    }

    return studentTask;
}


async function handleRateMindMaps(studentData) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');

   // const { ownerStudentId, QandAId, rateStudentId, rate } = studentData;

    
    const { ownerUserName, mindMapId, rateStudentId, rate } = studentData;

    // Fetch the user by username to get their ID
    const ownerUser = await getByUserName(ownerUserName);
    if (!ownerUser || !ownerUser._id) {
        throw new Error('Owner user not found');
    }
    const ownerStudentId = ownerUser._id;
    

    // Check if the student task exists
    const studentTask = await collection.findOne({ studentId: new ObjectId(ownerStudentId) });
    if (!studentTask) {
        throw new Error('Student task not found');
    }

    // Find the specific QandA element using the positional operator ($)
    const game2 = studentTask.module1.game2;
    const qAndAIndex = game2.mindMaps.findIndex(q => q._id.equals(mindMapId));

    if (qAndAIndex === -1) {
        throw new Error('MindMap not found');
    }

    if (rateStudentId !== ownerStudentId) {
        if (rate === 'LIKE') {
            // Use $addToSet to add rateStudentId to likes if not already present
            await collection.updateOne(
                { studentId: new ObjectId(ownerStudentId), 'module1.game2.mindMaps._id': new ObjectId(mindMapId) },
                { $addToSet: { 'module1.game2.mindMaps.$.likes': rateStudentId } }
            );
        } else if (rate === 'DISLIKE') {
            // Use $pull to remove rateStudentId from likes if present
            await collection.updateOne(
                { studentId: new ObjectId(ownerStudentId), 'module1.game2.mindMaps._id': new ObjectId(mindMapId) },
                { $pull: { 'module1.game2.mindMaps.$.likes': rateStudentId } }
            );
        }
    }

    // Return the updated student task (optional, depending on your needs)
    return await collection.findOne({ studentId: new ObjectId(ownerStudentId) });
}

module.exports = { addMindMap, getGame2Details ,updateSharedStatus , getSharedMindMaps , handleRateMindMaps , getSharedMindMapsForAdmin};

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