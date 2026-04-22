import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const csrfTokenGenerator = (req: Request, res: Response, next: NextFunction) => {
    // Generate token if not exists
    if (!req.cookies['XSRF-TOKEN']) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie('XSRF-TOKEN', token, {
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            httpOnly: false, // Must be readable by client JS to send back as header
        });
    }
    next();
};

export const csrfVerifier = (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const cookieToken = req.cookies['XSRF-TOKEN'];
    const headerToken = req.headers['x-xsrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({ error: 'CSRF token mismatch or missing' });
    }

    next();
};
