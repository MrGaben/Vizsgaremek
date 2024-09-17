const express = require('express');
const mysql = require("mysql");
const path = require("path");
const dotenv = require('dotenv');
const bcrypt = require("bcryptjs");

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
    res.render("loggedin");
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

    // Check for empty fields
    if (!email || !password) {
        return res.render('login', {
            message: 'Please enter both email and password'
        });
    }

    // Check if email exists
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

        // Compare password
        const user = result[0];
        try {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.render('login', {
                    message: 'Email or password is incorrect'
                });
            }

            // Redirect to logged-in page
            res.redirect('/loggedin');
        } catch (compareError) {
            console.log('Error comparing password:', compareError);
            return res.render('login', {
                message: 'An error occurred while processing your request.'
            });
        }
    });
});


app.listen(5000, () => {
    console.log("Server started on port 5000");
});
