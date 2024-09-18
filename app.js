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
        return next(); // If no token, allow access to public routes
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return next(); // If token is invalid, allow access to public routes
        }

        req.user = decoded;
        res.locals.user = decoded; // Make user available in views
        return next(); // Continue to the next middleware or route
    });
};

app.use(checkAuth);

// Apply checkAuth middleware to all routes



// BEJELENTKEZETT OLDALAK

app.get("/", (req, res) => { // EZ NEM BEJELENTKEZETT OLDAL
    if (req.user) return res.redirect('/logIndex'); // Redirect if authenticated
    res.render("index");
});

app.get("/logIndex", (req, res) => {
    if (!req.user) return res.redirect('/'); // Redirect if authenticated
    res.render("logIndex");
});

app.get("/logUserSettings", (req, res) => {
    if (!req.user) return res.redirect('/login'); // Redirect to login if not authenticated

    console.log(req.user); // Ellenőrizd, hogy a user adatok helyesek-e

    res.render("logUserSettings", {
        user: {
            name: req.user.name,
            email: req.user.email
        }
    });
});

// KIJELENTKEZETT EMBEREK

app.get("/register", (req, res) => {
    if (req.user) return res.redirect('/loggedin'); // Redirect if authenticated
    res.render("register");
});

app.get("/login", (req, res) => {
    if (req.user) return res.redirect('/loggedin'); // Redirect if authenticated
    res.render("login");
});

app.get("/loggedin", (req, res) => {
    if (!req.user) return res.redirect('/login'); // Redirect to login if not authenticated
    res.render('loggedin');
});




app.post("/auth/register", async (req, res) => {
    const { name, email, password, password_confirm, birthdate, address, phonenumber } = req.body;

    // Check if email is already in use
    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, result) => {
        if (error) {
            console.log('Error checking email:', error);
            return res.render('register', {
                message: 'An error occurred. Please try again.'
            });
        }

        if (result.length > 0) {
            return res.render('register', {
                message: 'This email is already in use'
            });
        } else if (password !== password_confirm) {
            return res.render('register', {
                message: 'Password didn\'t match!'
            });
        }

        // Password hashing
        let hashedPassword;
        try {
            hashedPassword = await bcrypt.hash(password, 8);
        } catch (hashError) {
            console.log('Error hashing password:', hashError);
            return res.render('register', {
                message: 'An error occurred while processing your request.'
            });
        }

        // Insert user into the database
        db.query('INSERT INTO users SET ?', { name, email, password: hashedPassword, birthdate, address, phonenumber }, (err) => {
            if (err) {
                console.log('Error inserting user:', err);
                return res.render('register', {
                    message: 'An error occurred. Please try again.'
                });
            } else {
                return res.render('register', {
                    message: 'User registered!'
                });
            }
        });
    });
});

app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('login', {
            message: 'Please enter both email and password'
        });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, result) => {
        if (error) {
            console.log('Error checking email:', error);
            return res.render('login', {
                message: 'An error occurred. Please try again.'
            });
        }

        if (result.length === 0) {
            return res.render('login', {
                message: 'Email or password is incorrect'
            });
        }

        const user = result[0];
        try {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.render('login', {
                    message: 'Email or password is incorrect'
                });
            }

            // Create a token that lasts for 1 minute
            const token = jwt.sign({ userId: user.id, name: user.name, email: user.email }, jwtSecret, { expiresIn: '10m' });
            res.cookie('auth_token', token, { httpOnly: true }); // Store token in a cookie
            res.redirect('/loggedin');
        } catch (compareError) {
            console.log('Error comparing password:', compareError);
            return res.render('login', {
                message: 'An error occurred while processing your request.'
            });
        }
    });
});

app.get("/logout", (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/login');
});

app.post("/refresh-token", (req, res) => {
    const token = req.cookies.auth_token;

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token is invalid or expired' });
        }

        // Create a new token
        const newToken = jwt.sign({ userId: decoded.userId }, jwtSecret, { expiresIn: '10m' });
        res.cookie('auth_token', newToken, { httpOnly: true });
        res.json({ message: 'Token refreshed' });
    });
});


// User update
app.post("/auth/updateUser", (req, res) => {
    if (!req.user) return res.redirect('/login'); // Ellenőrizzük, hogy a felhasználó be van-e jelentkezve

    const { name, email } = req.body;
    const userId = req.user.userId; // A felhasználó azonosítója

    // Frissítjük a felhasználói adatokat az adatbázisban
    db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, userId], (err, result) => {
        if (err) {
            console.log('Error updating user:', err);
            return res.render('logUserSettings', {
                message: 'An error occurred. Please try again.',
                user: { name: req.user.name, email: req.user.email } // Használjuk a régi adatokat
            });
        }

        // Új token létrehozása az új adatokkal
        const newToken = jwt.sign({ userId: userId, name: name, email: email }, jwtSecret, { expiresIn: '10m' });
        res.cookie('auth_token', newToken, { httpOnly: true }); // A új token tárolása a cookie-ban

        // Az új adatokat is lekérdezzük az adatbázisból
        db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
            if (err) {
                console.log('Error fetching updated user:', err);
                return res.render('logUserSettings', {
                    message: 'An error occurred. Please try again.',
                    user: { name: req.user.name, email: req.user.email } // Régi adatok hiba esetén
                });
            }

            const updatedUser = results[0];
            res.render('logUserSettings', {
                message: 'User information updated successfully!',
                user: { name: updatedUser.name, email: updatedUser.email } // Az új adatok
            });
        });
    });
});




// A szerver elindult(Elvileg )
app.listen(5000, () => {
    console.log("Server started on port 5000");
}); 