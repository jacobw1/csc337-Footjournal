/*
Dylan Burish, Jacob Williams, Francisco Figueroa
CSC 337
Final Project
server.js
**Short desc. of server-side processes**
*/


/*
Imported modules
*/
const express = require('express');
const mongoose = require('mongoose');
const upload = require('multer');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());
app.use(express.json()); //parses incoming JSON on arrival
app.use('/app/*', auth);
app.use(express.static('public_html'));
app.get('/', (req, res) => { res.redirect('/app/home.html')})
var sessions = new Map();
const MAX_LOGIN_TIME = 300000; //5 minutes

/*
The connect() method of the mongoose module object. We preform the actual connection and we
also create the instance for the Schema object to be used later. The mongoose connection object is also
monitored to be actually connected.
*/
var dbURL = 'mongodb://127.0.0.1:27017/final_project';
mongoose.connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true });
var Schema = mongoose.Schema;
const conn = mongoose.connection;
conn.on('connected', () => {
    console.log('Connected to database');
})
conn.on('disconnected', () => {
    console.log('Disconnected from database');
})
conn.on('error', console.error.bind(console, 'connection error: '));


/*
The creation of a Schema object that will act as our skeleton structure to preform entries into our
Mongo database. When the object structure is layed out, a mongoose.model() object is created
that holds our created Schema and have entering data be modeled against it.
*/
//Schema for users
var userSchema = new Schema({
    name: String,
    username: String,
    password: String,
    birthday: String,
    profilePicture: String,
    followers: [{type:mongoose.Types.ObjectId, ref:'Users'}],
    following: [{type:mongoose.Types.ObjectId, ref:'Users'}],
    likes: [{type:mongoose.Types.ObjectId, ref:'Posts'}]
});
var Users = mongoose.model('users', userSchema);

//Schema for Posts
var postSchema = new Schema({
    title: String,
    body: String,
    image: String,
    date: String,
    isCommentable: Boolean, //differs from schema on footjournal can change if u guys want*********
    likeCount: Number,
    likeBy: [{type:mongoose.Types.ObjectId, ref:'Users'}],
    comments: [{type:mongoose.Types.ObjectId, ref:'Comments'}]
});
var Posts = mongoose.model('posts', postSchema);

//Schema for Comments
var comSchema = new Schema({
    username: String,
    body: String,
    date: String,
    likeCount: String // i think its the post id type unless it has a special one
});
var Comments = mongoose.model('comments', comSchema);

//Schema for Message
var msgSchema = new Schema({
    toUser: String,
    fromUser: String,
    body: String,
    date: String
});
var Messages = mongoose.model('msgs', msgSchema);


/*
Authentication, session creation, and session filtering section used to keep track of current users 'online'
thus either keeping their sesison active or logging them off if inactive.
We can salt and hash these if you guys want too ****************
*/
//Loops through my map() and checks against the MAX_LOGIN_TIME to see if a user should be logged off.
function filterSessions(){
    var now = Date.now();
    for(let key of sessions.keys()){
        time = sessions.get(key);
        if(MAX_LOGIN_TIME + time < now){
            console.log(key + "'s session expired");
            sessions.delete(key);
        }
    }
}
setInterval(filterSessions, 2000);

//Creates a session for a user that has logged in or interacted with the site.
function createSession(username){
    var now = Date.now();
    sessions.set(username, now);
    console.log('session created for ' + username);
}

//Checks to see if a user exists within the map() that holds current in-session users
function checkSession(username){
    if(sessions.get(username) != undefined){
        return true;
    }
    return false
}

//Checks to see if user-session is valid and if-so updates their current session, redirects if invalid
function auth(req, res, next){
    var cook = req.cookies;
    if(cook && cook.login){
        var user = cook.login.username;
        if(checkSession(user)){
            createSession(user);
            next();
        }
        else{
            res.redirect('/login/index.html');
        }
    }
    else{
        res.redirect('/login/index.html');
    }
}


/*
User creation and login section, send either a POST or GET request respectively to either confirm an
existing user and allow them to sign-in or create a brand new user
*/
//we can change this to better accommodate a more reliable user login i just copied what Ben did tbh*******
app.get('/account/login/:user/:pass', (req, res) => {
    var user = decodeURIComponent(req.params.user);
    var pss = decodeURIComponent(req.params.password);
    Users.find({'username': user, 'password': pss}).exec((err, result) => {
        if(err){
            return res.send('ERROR LOGGING IN');
        }
        else if(result.length == 1){
            createSession(user);
            res.cookie("login", {username: user},{maxAge: 300000}); //5 minute cookie life
            res.end('LOGIN');
        }
        else{
            res.end('Incorrect number of users');
        }
    });
});

//idk if you guys want to user multer for this also didnt know if you guys wanted unique usernames *******
app.post('/account/create', (req,res) => {
    var entry = new Users({
        name: req.body.name,
        username: req.body.username,
        password: req.body.password,
        birthday: req.body.birthday,
        profilePicture: req.body.image
    });
    entry.save((err) => {
        if(err){
            console.log('ERROR CREATING NEW USER');
            res.send('ERROR CREATING NEW USER');
        }
        res.send('User creation successful');
    });
});


/*
Post section
*/
//
