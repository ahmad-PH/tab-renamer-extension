import express from 'express';
import path from 'path';

/**
 * Express server utilities for Playwright tests
 * Equivalent to selenium_e2e/utils.js
 */

export const startExpressServer = (app: express.Application, port: number): Promise<express.Server> => {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, (err?: Error) => {
            err ? reject(err) : resolve(server);
        });
    });
};

export const startExpressServerWithHTML = async (port: number, html: string): Promise<express.Server> => {
    const app = express();
    app.get('/', (req, res) => {
        res.send(html);
    });
    return await startExpressServer(app, port);
};

export const createTestServer = (port: number = 3001): express.Application => {
    const app = express();
    app.use('/', express.static(path.resolve(__dirname, '..', 'data', 'basic_webpage')));
    return app;
};
