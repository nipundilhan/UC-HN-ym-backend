const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // <-- Import the cors package

const errorHandler = require('./middlewares/error-handler');

const authController = require('./controllers/auth-controller');
const userController = require('./controllers/user-controller');
const testController = require('./controllers/test-controller');
const modulesController = require('./controllers/modules-controller');
const tutorialGameController = require('./controllers/module1-game1-tutorial-game-controller');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

//allow to access from anywhere
app.use(cors());
app.use(bodyParser.json());

const rootPath = '/YM';

app.use(rootPath+'/auth', authController);
app.use(rootPath+'/user', userController);
app.use(rootPath+'/test', testController);
app.use(rootPath+'/modules', modulesController);
app.use(rootPath+'/tutorial', tutorialGameController);

// hand over the errors to error handler
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});