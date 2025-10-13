import express from 'express';
import http from 'http';
import net from 'net';

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Finds the next available port starting from the given port number.
 * Checks ports sequentially until an available one is found.
 * @param startPort - The port number to start checking from (default: 3001)
 * @returns Promise<number> - The first available port number
 */
export async function findAvailablePort(startPort: number = 3000): Promise<number> {
    return new Promise((resolve, _reject) => {
        const checkPort = (port: number) => {
            const server = net.createServer();
            
            server.listen(port, () => {
                server.once('close', () => {
                    resolve(port);
                });
                server.close();
            });
            
            server.on('error', () => {
                // Port is in use, try the next one
                checkPort(port + 1);
            });
        };
        
        checkPort(startPort);
    });
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