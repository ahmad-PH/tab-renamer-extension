const startExpressServer = (app, port) => {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, (err) => {
            err ? reject(err) : resolve(server)
        });
    });
};

module.exports = { startExpressServer };