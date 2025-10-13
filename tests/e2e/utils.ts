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

export class PromiseLock {
    private promise!: Promise<void>;
    private resolve!: () => void;
    private isLocked: boolean = false;

    constructor() {
        this.createNewLock();
    }

    private createNewLock() {
        this.resolve = () => {};
        this.promise = new Promise<void>((resolve) => {
            this.resolve = resolve;
        });
        this.isLocked = true;
    }

    get lock(): Promise<void> {
        return this.promise;
    }

    release(): this {
        if (this.isLocked) {
            this.resolve();
            this.isLocked = false;
        }
        return this;
    }

    reset(): this {
        this.createNewLock();
        return this;
    }

    get locked(): boolean {
        return this.isLocked;
    }
}