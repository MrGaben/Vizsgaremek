// controllers/checkAuth.js
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('./configController.js');
const db = require('./dbConnection.js'); // Külön modulként kezeljük az adatbázis kapcsolatot

const checkAuth = (req, res, next) => {
    const token = req.cookies.auth_token;

    if (!token) {
        return next();
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return next();
        }

        req.user = decoded;
        res.locals.user = decoded;

        db.query('SELECT admin FROM users WHERE id = ?', [decoded.userId], (err, result) => {
            if (err || result.length === 0) {
                req.user.isAdmin = false;
            } else {
                req.user.isAdmin = result[0].admin === 1;
            }
            return next();
        });
    });
};

module.exports = checkAuth;
