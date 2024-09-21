const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const checkAuth = require('./controllers/checkAuth.js');
const authController = require('./controllers/authController.js');
const router = express.Router();
const userController = require('./controllers/userController.js');
const exphbs = require('express-handlebars');

dotenv.config({ path: './.env' });

const app = express();

const publicDir = path.join(__dirname, './public');
app.use(express.static(publicDir));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());



// Middleware a form és JSON adatok kezeléséhez
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Regisztrálj a Handlebars segédet
const hbs = exphbs.create({
    helpers: {
        eq: (a, b) => a === b
    }
});

app.engine('hbs', hbs.engine);

app.set('views', './views');

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

// Add this route for the admin page
app.get("/admin", userController.getAllUsers);

app.post('/admin/toggleRole', userController.toggleRole);

app.post("/auth/register", authController.register);
app.post("/auth/login", authController.login);
app.get("/logout", authController.logout);

app.post("/auth/updateUser", userController.updateUser);
app.post("/auth/changePassword", authController.changePassword);

app.listen(5000, () => {
    console.log("Server started on port 5000");
});
