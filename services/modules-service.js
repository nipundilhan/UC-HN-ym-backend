// services/moduleService.js
const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');
const { getUserById } = require('../services/user-service');

// Define the structure of the studentTask when a new one is created
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

async function getGameDetails(moduleCode, gameCode) {

    const db = await connectDB();
    const collection = db.collection('modules');

    // Find the module by moduleCode and the specific game by its code
    const module = await collection.findOne(
        { moduleCode, "games.code": gameCode },
        { projection: { "games.$": 1 } } // Select only the matching game from the array
    );

    if (!module || module.games.length === 0) {
        throw new Error('Game not found in the specified module');
    }


    const game = module.games[0]; // The matched game
    return {
        name: game.name,
        achievementMargin: game.achievementMargin
    };

}


async function findStudentGameMarks(studentId) {

    const game1Details = await getGameDetails("MD01", "GM01");


    const db = await connectDB();
    const collection = db.collection('studentTasks');
    
    // Convert the studentId to an ObjectId if it's not already
    const query = { studentId: new ObjectId(studentId) };
    
    // Find the first document with the matching studentId
    const result = await collection.findOne(query);

    if (!result) {
        throw new Error('Student not found');
    }


    
    const stdnt = await getUserById(studentId);
        



    // Generate complete moods array (recorded + missing days)
    const completeMoods = generateCompleteMoods(result.moods);

    const response = {
        taskId : result._id,
        avatarCode : stdnt.avatarCode,
        game1CompletedTasks: result.module1.game1.tasks.length,
        game1Marks: result.module1.game1.gamePoints,
        game1Margin: game1Details.achievementMargin,
        totalMarks: calculateTotalMarks(result) ,
        moods: completeMoods,
    };

    // Check if game2 exists before adding it to the response
    if (result.module1.game2) {
        response.game2Marks = result.module1.game2.gamePoints;
    }

    return response;
}

function calculateTotalMarks(result) {
    // Assuming total marks is the sum of gamePoints and other logic if needed
    return result.module1.game1.gamePoints + result.module1.game1.gamePoints; // Replace with the actual logic if different
}



function generateCompleteMoods(moods) {
    // Helper function to format date to 'yyyy-mm-dd'
    const formatDate = (date) => date.toISOString().split('T')[0];

    // Helper function to get last 30 days as an array of dates
    const getLast30Days = () => {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            dates.push(formatDate(d));
        }
        return dates;
    };

    // Extract recorded moods
    const recordedMoods = moods.map(mood => ({
        date: formatDate(new Date(mood.date)),
        mood: mood.mood
    }));

    // Get all dates for the last 30 days
    const last30Days = getLast30Days();

    // Create a complete moods array, filling in missing days with the dummy mood
    const completeMoods = last30Days.map(date => {
        const recordedMood = recordedMoods.find(m => m.date === date);
        return recordedMood ? recordedMood : { date, mood: 'missed' };
    });

    return completeMoods;
}



module.exports = { getGameDetails , findStudentGameMarks , defineStudentTaskStructure , calculateTotalMarks};