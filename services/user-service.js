// services/userService.js
const connectDB = require('../config/db');
const { ObjectId } = require('mongodb');

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
    return result;
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

module.exports = { validateUserDetails, createUserStudent, handleUserSignup ,getUserById };