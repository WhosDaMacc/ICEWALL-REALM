export class HttpException extends Error {
    public status: number;
    public message: string;
    public errors?: any[];

    constructor(status: number, message: string, errors?: any[]) {
        super(message);
        this.status = status;
        this.message = message;
        this.errors = errors;
        Object.setPrototypeOf(this, HttpException.prototype);
    }
}

export class BadRequestException extends HttpException {
    constructor(message: string = 'Bad Request', errors?: any[]) {
        super(400, message, errors);
    }
}

export class UnauthorizedException extends HttpException {
    constructor(message: string = 'Unauthorized') {
        super(401, message);
    }
}

export class ForbiddenException extends HttpException {
    constructor(message: string = 'Forbidden') {
        super(403, message);
    }
}

export class NotFoundException extends HttpException {
    constructor(message: string = 'Not Found') {
        super(404, message);
    }
}

export class ConflictException extends HttpException {
    constructor(message: string = 'Conflict') {
        super(409, message);
    }
}

export class InternalServerErrorException extends HttpException {
    constructor(message: string = 'Internal Server Error') {
        super(500, message);
    }
} 