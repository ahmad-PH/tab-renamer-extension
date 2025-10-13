import express from 'express';
import http from 'http';

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export function startExpressServer(app: express.Express, port: number): Promise<http.Server> {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, (err) => {
            err ? reject(err) : resolve(server)
        });
    });
};