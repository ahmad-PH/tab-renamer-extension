const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from the basic_webpage directory
app.use('/', express.static(path.resolve(__dirname, '..', 'data', 'basic_webpage')));

// Start the server
const server = app.listen(port, () => {
    console.log(`Test server running on http://localhost:${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down test server...');
    server.close(() => {
        console.log('Test server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Shutting down test server...');
    server.close(() => {
        console.log('Test server closed');
        process.exit(0);
    });
});
