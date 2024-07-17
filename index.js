const express = require('express');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Define a simple GET route
app.get('/', (req, res) => {
    res.send('Hello World Express JS!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});