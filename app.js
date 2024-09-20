const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const checkAuth = require('./controllers/checkAuth.js');
const authController = require('./controllers/authController.js');
const userController = require('./controllers/userController.js');

dotenv.config({ path: './.env' });

const app = express();

const publicDir = path.join(__dirname, './public');
app.use(express.static(publicDir));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

app.set('view engine', 'hbs');

// Middleware to check if user is authenticated
app.use(checkAuth);

// Routes
app.get("/", (req, res) => {
    if (!req.user) return res.redirect('/login');
    if (req.user) return res.redirect('/logIndex');
    res.render("index");
});

app.get("/logIndex", (req, res) => {
    if (!req.user) return res.redirect('/');
    res.render("logIndex");
});

app.get("/logUserSettings", userController.getUserSettings);

app.get("/register", (req, res) => {
    if (req.user) return res.redirect('/logIndex');
    res.render("register");
});

app.get("/login", (req, res) => {
    if (req.user) return res.redirect('/logIndex');
    res.render("login");
});

app.get("/forgotPass", (req, res) => {
    if (req.user) return res.redirect('/logIndex');
    res.render("forgotPass");
});

app.get("/loggedin", (req, res) => {
    if (!req.user) return res.redirect('/login');
    res.render('loggedin');
});

app.post("/auth/register", authController.register);
app.post("/auth/login", authController.login);
app.get("/logout", authController.logout);

app.post("/auth/updateUser", userController.updateUser);
app.post("/auth/changePassword", authController.changePassword);

app.listen(5000, () => {
    console.log("Server started on port 5000");
});
