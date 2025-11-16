const express = require('express');

const startExpressServer = (app, port) => {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, (err) => {
            err ? reject(err) : resolve(server)
        });
    });
};

const startExpressServerWithHTML = async (port, html) => {
    const app = express();
    app.get('/', (req, res) => {
        res.send(html);
    });
    return await startExpressServer(app, port);
}

module.exports = { startExpressServer, startExpressServerWithHTML };