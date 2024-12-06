// services/userService.js
const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');
const { defineStudentTaskStructure  } = require('../services/modules-service');

function defineUserStructure(id, userData, userRole) {
    return {
        _id: id ? new ObjectId(id) : new ObjectId(),
        username: userData.username,
        role: userRole,
        gender: userData.gender,
        dob: userData.dob,
        email: userData.email,
        password: userData.password,
        avatarCode :userData.avatarCode,
        signupDate: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD
    };
}

async function validateUserDetails(username, email) {
    const db = await connectDB();
    const collection = db.collection('users');

    const user = await collection.findOne({
        $or: [{ username }, { email }],
    });
    return user ? true : false;
}

async function createUserStudent(userData) {
    const db = await connectDB();
    const collection = db.collection('users');

    const user = defineUserStructure(null, userData , "STUDENT");

    const result = await collection.insertOne(user);


    const collection1 = db.collection('studentTasks');
    const dummyData = { studentName: userData.username, studentId: result.insertedId };   
    let studentTask = defineStudentTaskStructure(dummyData);
    await collection1.insertOne(studentTask);

    return result;
}

async function updateStudent(userData) {
    const db = await connectDB();
    const collection = db.collection('users');

    if (!userData._id) {
        throw new Error('User ID is required for updating a student.');
    }

    const filter = { _id: new ObjectId(userData._id) };
    const update = {
        $set: {
            gender: userData.gender,
            dob: userData.dob,
            avatarCode: userData.avatarCode,
        },
    };

    const result = await collection.updateOne(filter, update);

    if (result.matchedCount === 0) {
        throw new Error('User not found.');
    }

    return {
        status: "Updated"
    };
}

async function handleUserSignup(userDetails) {
    const { username, email } = userDetails;


    // Validate if username or email already exists
    const userExists = await validateUserDetails(username, email);
    if (userExists) {
        throw new Error('Username or email already exists');
    }


    // Create and save new user
    const newUser = await createUserStudent(userDetails);
    return newUser;
}





async function handleInstructorSignup(userDetails) {
    const { username, email } = userDetails;


    // Validate if username or email already exists
    const userExists = await validateUserDetails(username, email);
    if (userExists) {
        throw new Error('Username or email already exists');
    }


    // Create and save new user
    const newUser = await createUserInstructor(userDetails);
    return newUser;
}

async function createUserInstructor(userData) {
    const db = await connectDB();
    const collection = db.collection('users');

    const user = defineUserStructure(null, userData , "INSTRUCTOR");

    const result = await collection.insertOne(user);


    return result;
}

/*
async function getUserById(id) {
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
*/

async function getByUserName(userName) {
    const db = await connectDB();
    const collection = db.collection('users');

    try {
        const user = await collection.findOne({ username: userName });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    } catch (error) {
        throw new Error(`Error fetching user by username: ${error.message}`);
    }
}

module.exports = { validateUserDetails, createUserStudent, handleUserSignup   , getByUserName , updateStudent , handleInstructorSignup};