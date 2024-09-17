const express = require('express');
const mysql = require("mysql");
const path = require("path");
const dotenv = require('dotenv');
const bcrypt = require("bcryptjs");

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('./controller/configController.js'); // Importáld a jwtSecret-et
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

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/loggedin", (req, res) => {
    const token = req.cookies.auth_token; // Get the token from cookies

    if (!token) {
        return res.redirect('/login'); // Redirect to login if no token
    }

    // Verify the token
    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return res.redirect('/login'); // Redirect to login if token is invalid
        }

        // Render the logged-in page if token is valid
        res.render('loggedin');
    });
});

const checkAuth = (req, res, next) => {
    const token = req.cookies.auth_token;

    if (!token) {
        return res.redirect('/login');
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return res.redirect('/login'); // Token is invalid or expired
        }

        req.user = decoded;
        next();
    });
};

// Apply middleware to protected routes
app.use('/loggedin', checkAuth);

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

        // Hash the password
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

            // Create and send JWT token with 1 minute expiry
            const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '1m' });
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


app.listen(5000, () => {
    console.log("Server started on port 5000");
});
