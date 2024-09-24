// services/notification-service.js
const { ObjectId } = require('mongodb');
const connectDB = require('../config/db');
const { getUserById } = require('../services/user-service');

function defineNotificationStructure(id, studentId, userName, avatarCode, notificationData) {
    return {
        _id: id ? new ObjectId(id) : new ObjectId(),
        studentId: new ObjectId(studentId),
        userName,
        avatarCode,
        date: new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }),
        notificationType: notificationData.notificationType,
        title: notificationData.title,
        description: notificationData.description,
        reference: notificationData.reference,
        likes: [] // initialize likes with 0
    };
}

async function addNotification(notificationData) {
    const db = await connectDB();
    const collection = db.collection('notifications');

    // /* this is the space to get the userName , avatarCode using studentId */
    const stdnt = await getUserById(notificationData.studentId);

    if (notificationData.notificationType === 'BADGE') {
        notificationData.description = 'You have shared a badge';
    } else if (notificationData.notificationType === 'MINDMAP') {
        notificationData.description = 'You have shared a mindmap';
    }

    // Define notification structure
    const notification = defineNotificationStructure(null, notificationData.studentId, stdnt.username, stdnt.avatarCode, notificationData);

    const result = await collection.insertOne(notification);
    return result;
}

// Rate notification (LIKE/DISLIKE)
async function rateNotification(id, type, userId) {
    const db = await connectDB();
    const collection = db.collection('notifications');

    const notification = await collection.findOne({ _id: new ObjectId(id) });

    if (!notification) {
        throw new Error('Notification not found');
    }

    if (type === 'LIKE') {
        // If the userId is not in the likes array, add it
        if (!notification.likes.includes(userId)) {
            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $push: { likes: userId } }
            );
        }
    } else if (type === 'DISLIKE') {
        // If the userId is in the likes array, remove it
        if (notification.likes.includes(userId)) {
            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $pull: { likes: userId } }
            );
        }
    }

    const updatedNotification = await collection.findOne({ _id: new ObjectId(id) });
    return updatedNotification;
}

async function getNotificationsByUserId(userId) {
    const db = await connectDB();
    const collection = db.collection('notifications');

    // Fetch notifications ordered by latest, skip first 2, and limit to 1000
    const notifications = await collection.find({})
        .sort({ date: -1 })
        .skip(2)
        .limit(1000)
        .toArray();

    // Transform the notifications with additional fields
    const response = notifications.map(notification => {
        const liked = notification.likes.includes(userId) ? 'YES' : 'NO';
        const likeCount = notification.likes.length;

        return {
            _id: notification._id,
            studentId: notification.studentId,
            userName: notification.userName,
            avatarCode: notification.avatarCode,
            date: notification.date,
            notificationType: notification.notificationType,
            title: notification.title,
            description: notification.description,
            reference: notification.reference,
            liked,
            likeCount
        };
    });

    return response;
}

async function getAllNotifications() {
    const db = await connectDB();
    const collection = db.collection('notifications');

    // Retrieve all notifications sorted by date (latest first)
    const notifications = await collection.find({}).sort({ date: -1 }).toArray();
    return notifications;
}

// Dummy function: Replace this with your actual method to get user details
async function getUserInfo(studentId) {
    // Assuming this returns the userName and avatarCode based on studentId

    const stdnt = await getUserById(notificationData.studentId);
    
}

module.exports = { addNotification, getAllNotifications , rateNotification ,getNotificationsByUserId };