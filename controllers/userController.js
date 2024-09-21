// controllers/userController.js
const db = require('./dbConnection.js');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('./configController.js');

exports.getUserSettings = (req, res) => {
    if (!req.user) return res.redirect('/login');

    db.query('SELECT admin FROM users WHERE id = ?', [req.user.userId], (err, result) => {
        if (err || result.length === 0) {
            return res.redirect('/login');
        }

        const isAdmin = result[0].admin === 1;

        res.render("logUserSettings", {
            user: {
                name: req.user.name,
                email: req.user.email,
                address: req.user.address,
                phonenumber: req.user.phonenumber,
                isAdmin: isAdmin
            }
        });
    });
};

exports.updateUser = (req, res) => {
    if (!req.user) return res.redirect('/login');

    const userId = req.user.userId;

    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err || results.length === 0) {
            return res.render('logUserSettings', {
                message: 'An error occurred. Please try again.',
                user: { name: req.user.name, email: req.user.email, address: req.user.address, phonenumber: req.user.phonenumber }
            });
        }

        const existingUser = results[0];

        const updatedName = req.body.name || existingUser.name;
        const updatedEmail = req.body.email || existingUser.email;
        const updatedAddress = req.body.address || existingUser.address;
        const updatedPhoneNumber = req.body.phonenumber || existingUser.phonenumber;

        db.query('UPDATE users SET name = ?, email = ?, address = ?, phonenumber = ? WHERE id = ?', 
            [updatedName, updatedEmail, updatedAddress, updatedPhoneNumber, userId], 
            (err, result) => {
                if (err) {
                    return res.render('logUserSettings', {
                        message: 'An error occurred. Please try again.',
                        user: { name: existingUser.name, email: existingUser.email, address: existingUser.address, phonenumber: existingUser.phonenumber }
                    });
                }

                const newToken = jwt.sign({ userId: userId, name: updatedName, email: updatedEmail, address: updatedAddress, phonenumber: updatedPhoneNumber }, jwtSecret, { expiresIn: '10m' });
                res.cookie('auth_token', newToken, { httpOnly: true });

                res.render('logUserSettings', {
                    message: 'User information updated successfully!',
                    user: { name: updatedName, email: updatedEmail, address: updatedAddress, phonenumber: updatedPhoneNumber }
                });
            });
    });
};


exports.getAllUsers = (req, res) => {
    if (!req.user || !req.user.isAdmin) return res.redirect('/login');

    db.query('SELECT * FROM users', (err, results) => {
        if (err) {
            console.log('Error fetching users:', err);
            return res.render('admin', { message: 'An error occurred while fetching users.' });
        }
        res.render('admin', { users: results });
    });
};


exports.toggleRole = (req, res) => {
    const userId = req.body.userId;
    const currentRole = parseInt(req.body.admin); // Az admin státusz lekérése
    let newRole;

    console.log(`Toggling role for userId: ${userId}, current role: ${currentRole}`);

    // Rangok váltása
    newRole = currentRole === 0 ? 2 : 0; // User <-> Alkalmazott

    // Frissítés az adatbázisban
    db.query('UPDATE users SET admin = ? WHERE id = ?', [newRole, userId], (err) => {
        if (err) {
            console.log('Error updating role status:', err);
            return res.redirect('/admin');
        }
        console.log(`Successfully updated userId: ${userId} to new role: ${newRole}`);
        res.redirect('/admin');
    });
};