const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
        console.log('Token found:', token.substring(0, 20) + '...');

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token decoded, user id:', decoded.id);

            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                console.log('User not found in database');
                res.status(401);
                throw new Error('User not found in database');
            }
            
            console.log('User authenticated:', req.user.email);
            next();
        } catch (error) {
            console.error('Auth error:', error.message);
            res.status(401);
            throw new Error('Not authorized, token failed: ' + error.message);
        }
    } else {
        console.log('No authorization token provided');
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as an admin');
    }
};

const staffOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as an staff');
    }
};

module.exports = { protect, admin, staffOrAdmin };
