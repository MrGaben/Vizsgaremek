const express = require('express');
const mysql = require("mysql");
const path = require("path");
const dotenv = require('dotenv');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('./controller/configController.js');
const cookieParser = require('cookie-parser');

dotenv.config({ path: './.env' });

const app = express();

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

const publicDir = path.join(__dirname, './public');

app.use(express.static(publicDir));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

app.set('view engine', 'hbs');

db.connect((error) => {
    if (error) {
        console.log('Database connection error:', error);
    } else {
        console.log("MySQL connected!");
    }
});

// Middleware to check if user is authenticated
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
        return next();
    });
};

app.use(checkAuth);




app.get("/logIndex", (req, res) => {
    if (!req.user) return res.redirect('/');
    res.render("logIndex");
});

app.get("/logUserSettings", (req, res) => {
    if (!req.user) return res.redirect('/login');

    res.render("logUserSettings", {
        user: {
            name: req.user.name,
            email: req.user.email,
            address: req.user.address,
            phonenumber: req.user.phonenumber 
        }
    });
});


app.get("/", (req, res) => {
    if (req.user) return res.redirect('/logIndex');
    res.render("index");
});


app.get("/register", (req, res) => {
    if (req.user) return res.redirect('/loggedin');
    res.render("register");
});

app.get("/login", (req, res) => {
    if (req.user) return res.redirect('/loggedin');
    res.render("login");
});

app.get("/forgotPass", (req, res) => {
    if (req.user) return res.redirect('/loggedin');
    res.render("forgotPass");
});

app.get("/loggedin", (req, res) => {
    if (!req.user) return res.redirect('/login');
    res.render('loggedin');
});

app.post("/auth/register", async (req, res) => {
    const { name, email, password, password_confirm, address, phonenumber } = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, result) => {
        if (error) {
            console.log('Error checking email:', error);
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
            console.log('Error hashing password:', hashError);
            return res.render('register', { message: 'An error occurred while processing your request.' });
        }

        db.query('INSERT INTO users SET ?', { name, email, password: hashedPassword, address, phonenumber }, (err) => {
            if (err) {
                console.log('Error inserting user:', err);
                return res.render('register', { message: 'An error occurred. Please try again.' });
            } else {
                return res.render('register', { message: 'User registered!' });
            }
        });
    });
});

app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('login', { message: 'Please enter both email and password' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, result) => {
        if (error) {
            console.log('Error checking email:', error);
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
            res.redirect('/loggedin');
        } catch (compareError) {
            console.log('Error comparing password:', compareError);
            return res.render('login', { message: 'An error occurred while processing your request.' });
        }
    });
});

app.get("/logout", (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/login');
});

app.post("/auth/updateUser", (req, res) => {
    if (!req.user) return res.redirect('/login');

    const userId = req.user.userId;

    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err || results.length === 0) {
            console.log('Error fetching user:', err);
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

        // Update only the fields that have been modified
        db.query('UPDATE users SET name = ?, email = ?, address = ?, phonenumber = ? WHERE id = ?', 
            [updatedName, updatedEmail, updatedAddress, updatedPhoneNumber, userId], 
            (err, result) => {
                if (err) {
                    console.log('Error updating user:', err);
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
});


// Jelszó frissítése
app.post("/auth/changePassword", async (req, res) => {
    const { email, oldPass, newPass } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if (error || results.length === 0) {
            console.log('Error fetching user:', error);
            return res.render('forgotPass', { message: 'Felhasználó nem található.' });
        }

        const user = results[0];

        // Ellenőrizzük a régi jelszót
        const isMatch = await bcrypt.compare(oldPass, user.password);
        if (!isMatch) {
            return res.render('forgotPass', { message: 'Régi jelszó helytelen!' });
        }

        // Hash-eljük az új jelszót
        const hashedNewPassword = await bcrypt.hash(newPass, 8);

        // Frissítsük az adatbázist
        db.query('UPDATE users SET password = ? WHERE email = ?', [hashedNewPassword, email], (err) => {
            if (err) {
                console.log('Error updating password:', err);
                return res.render('forgotPass', { message: 'An error occurred while updating the password.' });
            }

            res.render('forgotPass', { message: 'Jelszó sikeresen megváltoztatva!' });
        });
    });
});


app.listen(5000, () => {
    console.log("Server started on port 5000");
});