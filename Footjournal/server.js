/*
Dylan Burish, Jacob Williams, Francisco Figueroa
CSC 337
Final Project -- Footjournal
server.js
**Short desc. of server-side processes**
*/


/*
Imported modules
*/
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const port = 80;
const app = express();

//const upload = multer({dest:''}); <- multer thing on docs idk if needed
app.use(cookieParser());
app.use(express.json()); //parses incoming JSON on arrival
app.use('/account/*', auth);
app.use(express.static('public_html'));
app.get('/', (req, res) => { res.redirect('/app/index.html')})
var hash = crypto.createHash('sha512'); //hashing algo.
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
    salt: String,
    hash: String,
    birthday: String,
    profilePicture: String,
    followers: [{type:mongoose.Types.ObjectId, ref:'Users'}],
    following: [{type:mongoose.Types.ObjectId, ref:'Users'}],
    likes: [{type:mongoose.Types.ObjectId, ref:'Posts'}],
    posts: [{type:mongoose.Types.ObjectId, ref:'Posts'}]
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
            res.redirect('/app/index.html');
        }
    }
    else{
        res.redirect('/app/index.html');
    }
}


/*
User creation and login section, send either a POST or GET request respectively to either confirm an 
existing user and allow them to sign-in or create a brand new user
*/
//we can change this to better accommodate a more reliable user login i just copied what Ben did tbh*******
app.get('/app/login/:username/:password', (req, res) => {
    var user = req.params.username;
    var pss = req.params.password;
    Users.find({'username': user}).exec((err, result) => {
        if(err){
            res.send('ERROR LOGGING IN');
        }
        else{
            if (result.length === 0){
              res.send("INCORRECT LOGIN ATTEMPT");
            } else {
              var data = hash.update(pss + result[0].salt, 'utf-8');//same asyc probs possiblities
              var attmpt = data.digest('hex');
              if(attmpt == result[0].hash){
                createSession(user);
                res.cookie("login", {username: user},{maxAge: 300000}); //5 minute cookie life
                res.send('success');
              }
              else{
                res.send('INCORRECT LOGIN ATTEMPT');
              }
            }
        }
    });
});

//*******need to accom. for multer *******
app.post('/app/create/', (req,res) => {
    pass = req.body.password;
    var nacl = crypto.randomInt(100000000);
    data = hash.update(pass + nacl, 'utf-8'); // would methods be skippin cause async ?
    spud = data.digest('hex'); // can put all of these in a call back if so tho
    Users.findOne({'username':req.body.username}).exec((err, result) => {
        if(err){
            console.log('ERROR CHECKING IF USERNAME AVAILABLE');
        }
        if(!result){
            var entry = new Users({
                name: req.body.name,
                username: req.body.username,
                salt: nacl,
                hash: spud,
                birthday: req.body.birthday,
                profilePicture: req.body.image
            });
            entry.save((err) => {
                if(err){
                    console.log('ERROR CREATING NEW USER');
                    res.send('ERROR CREATING NEW USER');
                }
                res.send('success');
            });
        }
        else{
            res.end('USERNAME ALREADY IN USE');
        }
    });
});


/*
Post section
*/
//*******need to accom. for multer ******* upload.single(''); i think
app.post('/account/create/post', (req,res) => {
    //▼ returns a string mm/dd/yyyy, hh:mm:ss AM/PM ▼
    postTime = (new Date(Date.now())).toLocaleString();
    var entry = new Posts({
        title: req.body.title,
        body: req.body.body,
        image: req.body.image,
        date: postTime,
        isCommentable: req.body.bool,
        likeCount: 0,
    });
    entry.save((err) => {
        if(err){
            console.log('ERROR SAVING POST AT DB');
            res.send('ERROR SAVING POST AT DB')
        }
        res.send('success');
    });
});

//will assume like-button has info used in like method ie onClickfunc(objectID) that gets send with the req
app.post('/account/like/post', (req, res) => {
    var user = req.cookies.login.username;
    Posts.findOneAndUpdate({'_id':req.body.id}, {$inc:{'likeCount':1}}, {new:true}).exec((err) => {
        if(err){
            console.log('ERROR INCREASING LIKE COUNT');
            res.send('ERROR INCREASING LIKE COUNT');
        }
        else{
            Users.findOne({'username': user}).exec((err, result) => {
                if(err){
                    console.log('ERROR IDENTIFYING USER LIKING THIS');
                    res.send('ERROR IDENTIFYING USER LIKING THIS');
                }
                else{
                    result.likes.push(req.body.id);
                    user.save((err) => {
                        if(err){
                            console.log('ERROR SAVING LIKE TO USER');
                            res.send('ERROR SAVING LIKE TO USER');
                        }
                        else{
                            console.log('LIKE SUCCESSFUL');
                            res.send('success');
                        }
                    });
                }
            });
        }
    });
});

//getting all the posts
app.get('/account/get/posts', (req, res) => {
    Posts.find({}).exec((err, results) => {
        if(err){
            console.log('PROBLEM GETTING ALL POSTS');
            res.send('PROBLEM GETTING ALL POSTS');
        }
        else{
            console.log('GETTING ALL POSTS SUCCESFUL');
            //▼ formatting json for testing purposes ▼
            res.send(JSON.stringify(results, null, 2));
        }
    });
});

//getting all current user's posts
app.get('/account/get/myPosts', (req, res) => {
    var user = req.cookies.login.username;
    Users.findOne({'username': user}).exec((err, result) => {
        if(err){
            console.log('ERR LOOKING FOR USER');
            res.send('ERR LOOKING FOR USER');
        }
        else{
            Posts.find({'_id': {$in:result.posts}}, (err, postList) => {
                if(err){
                    console.log('ERR FINDING POSTS FOR USER');
                    res.send('ERR FINDING POSTS FOR USER');
                }
                else{
                    console.log('success');
                    res.end(JSON.stringify(postList, null, 2));
                }
            });
        }
    });  
});

//searching all posts in case we want to implement something like this with maybe hashtags or somethin
app.get('/account/search/posts/:KEYWORDS', (req,res) => {
    var nKey = decodeURIComponent(req.params.KEYWORDS);
    Posts.find({'body': {$regex: new RegExp(nKey), $options:'i'}}).exec((err, results) => {
        if(err){
            console.log('err looking for user in purchases');
        }
        res.end(JSON.stringify(results, null, 2));
    });    
});


/*
Follow a user, fetching followers + following, and Likes for user
*/
//will assume follow button has somethin like onClickfunc(objectID) that gets send with the req
app.post('/app/follow/user', (req, res) => {
    var user = req.cookies.login.username;
    Users.findOne({'username': user}).exec((err, curUser) => {
        if(err){
            console.log('ERROR IDENTIFYING USER LIKING THIS');
            res.send('ERROR IDENTIFYING USER LIKING THIS');
        }
        else{
            Users.findOne({'_id':req.body.id}).exec((err, target) => {
                if(err){
                    console.log('ERROR FINDING TARGET USER');
                    res.send('ERROR FINDING TARGET USER');
                }
                else{
                    curUser.following.push(req.body.id);
                    target.followers.push(curUser._id)//i think is how u access id
                    //a lot of callback idk if we can skip any of this, couldnt find on stackoverflow if the save callbacks were optional
                    curUser.save((err) => {
                        if(err){
                            console.log('ERROR SAVING AT CURRENT USER');
                            res.send('ERROR SAVING AT CURRENT USER');
                        }
                        else{
                            target.save((err) => {
                                if(err){
                                    console.log('ERROR SAVING AT TARGET USER');
                                    res.send('ERROR SAVING AT TARGET USER');
                                }
                                else {res.send('success');}
                            });
                        }
                    });
                }
            });
        }
    });
});

//
app.get('/app/get/followers', (req, res) => {
    var user = req.cookies.login.username;
    Users.findOne({'username': user}).exec((err, result) => {
        if(err){
            console.log('ERROR FETCHING USER');
            res.send('ERROR FETCHING USER');
        }
        else{
            Users.find({'_id':{$in: result.followers}}, (err, followList) => {
                if(err){
                    console.log('ERROR FETCHING FOLLOWERS FOR USER');
                    res.send('ERROR FETCHING FOLLOWERS FOR USER');
                }
                else{
                    res.send(JSON.stringify(followList, null, 2));
                }
            });
        }
    });
});

//
app.get('/app/get/following', (req, res) => {
    var user = req.cookies.login.username;
    Users.findOne({'username': user}).exec((err, result) => {
        if(err){
            console.log('ERROR FETCHING USER');
            res.send('ERROR FETCHING USER');
        }
        else{
            Users.find({'_id':{$in: result.following}}, (err, followList) => {
                if(err){
                    console.log('ERROR FETCHING FOLLOWERS FOR USER');
                    res.send('ERROR FETCHING FOLLOWERS FOR USER');
                }
                else{
                    res.send(JSON.stringify(followList, null, 2));
                }
            });
        }
    });
});

//
app.get('/app/get/likes', (req, res) => {
    var user = req.cookies.login.username;
    Users.findOne({'username': user}).exec((err, result) => {
        if(err){
            console.log('ERROR FETCHING USER');
            res.send('ERROR FETCHING USER');
        }
        else{
            Users.find({'_id':{$in: result.likes}}, (err, likeList) => {
                if(err){
                    console.log('ERROR FETCHING FOLLOWERS FOR USER');
                    res.send('ERROR FETCHING FOLLOWERS FOR USER');
                }
                else{
                    res.send(JSON.stringify(likeList, null, 2));
                }
            });
        }
    });
}); 

app.listen(port, () => console.log("App is listening"));


/*
Misc.
*/
//
