// services/moduleService.js
const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');

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
    const response = {
        game1Marks: result.module1.game1.gamePoints,
        game1Margin: game1Details.achievementMargin,
        totalMarks: result.module1.game1.gamePoints + result.module1.game1.gamePoints
    };

    // Check if game2 exists before adding it to the response
    if (result.module1.game2) {
        response.game2Marks = result.module1.game2.gamePoints;
    }

    return response;
}



module.exports = { getGameDetails , findStudentGameMarks };