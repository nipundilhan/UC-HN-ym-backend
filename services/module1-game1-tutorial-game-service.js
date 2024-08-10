const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');


function defineStructureStudentTasks(id, studentMarksData ) {

    const totalGamePoints = studentMarksData.tasks.reduce((points, task) => {
        return points + (task.completePercentage === 100 ? 1 : 0);
    }, 0);

    return {
        _id : id ? new ObjectId(id) : new ObjectId(),
        studentName: studentMarksData.name,
        studentId: new ObjectId(studentMarksData.studentId),
        module1:{
            moduleCode : studentMarksData.moduleCode,
            game1:{
                gameCode : studentMarksData.gameCode,
                gamePoints: totalGamePoints,
                tasks: studentMarksData.tasks.map(tsk => ({
                    _id: tsk._id ? new ObjectId(tsk._id) : new ObjectId(),
                    name: tsk.name,
                    description: tsk.description,
                    date : tsk.date,
                    completePercentage :  tsk.completePercentage,
                    points: tsk.completePercentage === 100 ? 1 : 0,
                }))
            }
        }
    };
}

async function findStudentTasksByStudentID(studentId) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');
    
    // Convert the studentId to an ObjectId if it's not already
    const query = { studentId: new ObjectId(studentId) };
    
    // Find the first document with the matching studentId
    const result = await collection.findOne(query);

    return result;
}


async function handleAddTutorial(tutorialData) {
    const db = await connectDB();
    const collection = db.collection('studentTasks');

    if(tutorialData._id){
        const studentModel = await collection.findOne({ _id: new ObjectId(tutorialData._id) });
        
        const taskData = tutorialData.tasks[0];
        let taskPoints = taskData.completePercentage === 100 ? 1 : 0;


        if (taskData._id) {
            // Editing an existing task
            const taskId = new ObjectId(taskData._id);

            // Calculate the change in points
            const existingTask = studentModel.module1.game1.tasks.find(task => task._id.equals(taskId));
            if (!existingTask) {
                throw new Error('Task not found');
            }

            if(existingTask.completePercentage === 100){
                throw new Error('cant edit completed tasks');
            }

            const pointsDifference = taskPoints - (existingTask.completePercentage === 100 ? 1 : 0);

            // Update the existing task
            const result = await collection.updateOne(
                { _id: objectId, "module1.game1.tasks._id": taskId },
                {
                    $set: {
                        "module1.game1.tasks.$.name": taskData.name,
                        "module1.game1.tasks.$.description": taskData.description,
                        "module1.game1.tasks.$.date": taskData.date,
                        "module1.game1.tasks.$.completePercentage": taskData.completePercentage,
                        "module1.game1.tasks.$.points": taskPoints
                    },
                    $inc: { "module1.game1.gamePoints": taskPoints }
                }
            );

            return result;
        } else {

            const newTask = {
                _id: new ObjectId(), // Assign a new ObjectId for the task
                name: taskData.name,
                description: taskData.description,
                date: taskData.date,
                completePercentage :  taskData.completePercentage,
                points: taskPoints, // Points assigned to the new task
            };

            // Update the document with new task and increment gamePoints
            const result = await collection.updateOne(
                { _id: new ObjectId(tutorialData._id) },
                {
                    $push: { "module1.game1.tasks": newTask },
                    $inc: { "module1.game1.gamePoints": newTask.points }
                }
            );

            return result;
        }
    }else{
        const tutorial = defineStructureStudentTasks(null,tutorialData);
        const result = await collection.insertOne(tutorial);
        return result;
    }
    

    


}

module.exports = { handleAddTutorial , findStudentTasksByStudentID };