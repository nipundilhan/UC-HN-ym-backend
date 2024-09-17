// services/moduleService.js
const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');

// Define the structure of the studentTask when a new one is created
function defineStudentTaskStructure(studentData) {
    return {
        studentName: studentData.studentName || "",
        studentId: new ObjectId(studentData.studentId),
        moods: [],
        module1: {
            moduleCode: "MOD1",
            game1: {
                gameCode: "GM1",
                gamePoints: 0,
                tasks: []
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


    // Generate complete moods array (recorded + missing days)
    const completeMoods = generateCompleteMoods(result.moods);

    const response = {
        game1Marks: result.module1.game1.gamePoints,
        game1Margin: game1Details.achievementMargin,
        totalMarks: result.module1.game1.gamePoints + result.module1.game1.gamePoints,
        moods: completeMoods,
    };

    // Check if game2 exists before adding it to the response
    if (result.module1.game2) {
        response.game2Marks = result.module1.game2.gamePoints;
    }

    return response;
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
        return recordedMood ? recordedMood : { date, mood: 'N/R' };
    });

    return completeMoods;
}



module.exports = { getGameDetails , findStudentGameMarks , defineStudentTaskStructure};