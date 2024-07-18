const express = require('express');
const bodyParser = require('body-parser');

const authController = require('./controllers/auth-controller');
const userController = require('./controllers/user-controller');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

const rootPath = '/YM';

app.use(bodyParser.json());


app.use(rootPath+'/auth', authController);
app.use(rootPath+'/user', userController);


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});