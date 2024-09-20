// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const db = require('./dbConnection.js');
const { jwtSecret } = require('./configController.js');

exports.register = async (req, res) => {
    const { name, email, password, password_confirm, address, phonenumber } = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, result) => {
        if (error) {
            return res.render('register', { message: 'An error occurred. Please try again.' });
        }

        if (result.length > 0) {
            return res.render('register', { message: 'This email is already in use' });
        } else if (password !== password_confirm) {
            return res.render('register', { message: 'Password didn\'t match!' });
        }

        let hashedPassword;
        try {
            hashedPassword = await bcrypt.hash(password, 8);
        } catch (hashError) {
            return res.render('register', { message: 'An error occurred while processing your request.' });
        }

        db.query('INSERT INTO users SET ?', { name, email, password: hashedPassword, address, phonenumber }, (err) => {
            if (err) {
                return res.render('register', { message: 'An error occurred. Please try again.' });
            } else {
                return res.render('register', { message: 'User registered!' });
            }
        });
    });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('login', { message: 'Please enter both email and password' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, result) => {
        if (error) {
            return res.render('login', { message: 'An error occurred. Please try again.' });
        }

        if (result.length === 0) {
            return res.render('login', { message: 'Email or password is incorrect' });
        }

        const user = result[0];
        try {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.render('login', { message: 'Email or password is incorrect' });
            }

            const token = jwt.sign({ userId: user.id, name: user.name, email: user.email, address: user.address, phonenumber: user.phonenumber }, jwtSecret, { expiresIn: '10m' });
            res.cookie('auth_token', token, { httpOnly: true });
            res.redirect('/logIndex');
        } catch (compareError) {
            return res.render('login', { message: 'An error occurred while processing your request.' });
        }
    });
};

exports.logout = (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/login');
};

exports.changePassword = async (req, res) => {
    const { email, oldPass, newPass } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if (error || results.length === 0) {
            return res.render('forgotPass', { message: 'Felhasználó nem található.' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(oldPass, user.password);
        if (!isMatch) {
            return res.render('forgotPass', { message: 'Régi jelszó helytelen!' });
        }

        const hashedNewPassword = await bcrypt.hash(newPass, 8);
        db.query('UPDATE users SET password = ? WHERE email = ?', [hashedNewPassword, email], (err) => {
            if (err) {
                return res.render('forgotPass', { message: 'An error occurred while updating the password.' });
            }

            res.render('forgotPass', { message: 'Jelszó sikeresen megváltoztatva!' });
        });
    });
};
