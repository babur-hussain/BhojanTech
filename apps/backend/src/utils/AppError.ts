export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public errorCode?: string;

    constructor(message: string, statusCode: number, errorCode?: string) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.errorCode = errorCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
