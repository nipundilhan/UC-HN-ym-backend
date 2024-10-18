// services/module1-game3-QandA-service.js
const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');
const { defineStudentTaskStructure } = require('../services/modules-service');

async function handleGame3QandA(studentData) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');

    const { studentId, QandAId, lessonTitle, question, answer } = studentData;

    // Check if the student record exists
    let studentTask = await collection.findOne({ studentId: new ObjectId(studentId) });

    const newQandA = {
        _id: new ObjectId(),
        lessonTitle,
        question,
        answer,
        date: new Date().toISOString().split('T')[0], // today’s date in "YYYY-MM-DD" format
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


async function handleRateQandA(studentData) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');

    const { ownerStudentId, QandAId, rateStudentId, rate } = studentData;

    // Check if the student task exists
    const studentTask = await collection.findOne({ studentId: new ObjectId(ownerStudentId) });
    if (!studentTask) {
        throw new Error('Student task not found');
    }

    // Find the specific QandA element using the positional operator ($)
    const game3 = studentTask.module1.game3;
    const qAndAIndex = game3.QandA.findIndex(q => q._id.equals(QandAId));

    if (qAndAIndex === -1) {
        throw new Error('QandA not found');
    }

    if (rateStudentId !== ownerStudentId) {
        if (rate === 'LIKE') {
            // Use $addToSet to add rateStudentId to likes if not already present
            await collection.updateOne(
                { studentId: new ObjectId(ownerStudentId), 'module1.game3.QandA._id': new ObjectId(QandAId) },
                { $addToSet: { 'module1.game3.QandA.$.likes': rateStudentId } }
            );
        } else if (rate === 'DISLIKE') {
            // Use $pull to remove rateStudentId from likes if present
            await collection.updateOne(
                { studentId: new ObjectId(ownerStudentId), 'module1.game3.QandA._id': new ObjectId(QandAId) },
                { $pull: { 'module1.game3.QandA.$.likes': rateStudentId } }
            );
        }
    }

    // Return the updated student task (optional, depending on your needs)
    return await collection.findOne({ studentId: new ObjectId(ownerStudentId) });
}


async function getGame3QandAData(studentId) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');

    // Find the student record with the provided studentId
    const studentTask = await collection.findOne({ studentId: new ObjectId(studentId) });

    if (!studentTask || !studentTask.module1 || !studentTask.module1.game3) {
        throw new Error('No data found for the given student ID');
    }

    const game3 = studentTask.module1.game3;

    // Compute likesCount for each QandA and totalLikesCount for all QandA
    let totalLikesCount = 0;

    const qAndAData = game3.QandA.map(qAndA => {
        const likesCount = qAndA.likes ? qAndA.likes.length : 0;
        totalLikesCount += likesCount;

        return {
            ...qAndA,
            likesCount
        };
    });

    // Return the structured game3 data including totalLikesCount
    return {
        gameCode: game3.gameCode,
        gamePoints: game3.gamePoints,
        badgeShared: game3.badgeShared,
        QandA: qAndAData,
        totalLikesCount,
    };
}




async function getSharedQandAs(studentId) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');

    // Fetch all student tasks that contain shared QandAs
    const sharedTasks = await collection.find({ "module1.game3.QandA.sharedStatus": "SHARED" }).toArray();


    let sharedQandAs = [];

    // Loop through all student tasks
    sharedTasks.forEach(studentTask => {
        const game3 = studentTask.module1.game3;

        // Loop through the QandA array and filter shared QandAs
        game3.QandA.forEach(qAndA => {
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

                sharedQandAs.push({
                    _id: qAndA._id,
                    ownerStudentId : studentTask.studentId,
                    lessonTitle: qAndA.lessonTitle,
                    question: qAndA.question,
                    answer: qAndA.answer,
                    date: qAndA.date,
                    sharedStatus: qAndA.sharedStatus,
                    likesCount,
                    liked,
                    points: qAndA.points
                });
            }
        });
    });

    // Sort the filtered shared QandAs by date
    sharedQandAs.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Now apply the skip and limit after filtering and sorting
    const limitedQandAs = sharedQandAs.slice(0, 1000); // Skip the first 0, limit to the next 1000

    return {
        QandA: limitedQandAs
    };
}

async function updateSharedStatus(data) {
    const { ownerStudentId, QandAId, sharedStatus } = data;

    const db = await connectDB();
    const collection = db.collection('studentTasks');

    // Find the student task using ownerStudentId
    const studentTask = await collection.findOne({ studentId: new ObjectId(ownerStudentId) });

    if (!studentTask) {
        throw new Error('Student task not found');
    }

    // Find the specific QandA element
    const game3 = studentTask.module1.game3;
    const qAndAIndex = game3.QandA.findIndex(q => q._id.equals(new ObjectId(QandAId)));

    if (qAndAIndex === -1) {
        throw new Error('QandA not found');
    }

    // Update the sharedStatus
    game3.QandA[qAndAIndex].sharedStatus = sharedStatus;

    // Update the student task in the database
    await collection.updateOne(
        { studentId: new ObjectId(ownerStudentId), 'module1.game3.QandA._id': new ObjectId(QandAId) },
        { $set: { 'module1.game3.QandA.$.sharedStatus': sharedStatus } }
    );

    return {
        message: 'Shared status updated successfully',
        updatedQandA: game3.QandA[qAndAIndex]
    };
}



module.exports = { handleGame3QandA , handleRateQandA , getGame3QandAData , getSharedQandAs , updateSharedStatus   };