const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token)
        return res.status(401).json({ success: false, message: 'Access denied. Please log in.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campusfinder_secret_key');
        req.user = decoded; // { userId, name, email }
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
    }
};
