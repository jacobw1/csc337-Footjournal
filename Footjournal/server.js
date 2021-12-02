/*
Dylan Burish, Jacob Williams, Francisco Figueroa
CSC 337
Final Project -- Footjournal
server.js
**Short desc. of server-side processes**
Testing the reupload feature
LOL
*/


/*
Imported modules
*/
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const upload = multer({dest: 'uploads/images'});
const app = express();
const port = 80;
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser());
//app.use(express.json()); //parses incoming JSON on arrival
//app.use('/account/*', auth);
app.get('/', (req, res) => { res.redirect('/app/index.html')})
var hash = crypto.createHash('sha512'); //hashing algo.
var sessions = new Map();
const MAX_LOGIN_TIME = 7000; //5 minutes

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
    profilePicture: String,
    followers: [{type:mongoose.Schema.Types.ObjectId, ref:'Users'}],
    following: [{type:mongoose.Schema.Types.ObjectId, ref:'Users'}],
    likes: [{type:mongoose.Schema.Types.ObjectId, ref:'Posts'}],
    posts: [{type:mongoose.Schema.Types.ObjectId, ref:'Posts'}]
});
var Users = mongoose.model('Users', userSchema);

//Schema for Posts
var postSchema = new Schema({
    author: mongoose.Types.ObjectId,
    username: String,
    name: String,
    profilePicture: String,
    body: String,
    image: String,
    date: String,
    likeCount: Number,
    comments: [{type:mongoose.Schema.Types.ObjectId, ref:'Comments'}]
});
var Posts = mongoose.model('Posts', postSchema);

//Schema for Comments
var comSchema = new Schema({
    name: String,
    username: String,
    body: String,
    date: String,
});
var Comments = mongoose.model('Comments', comSchema);

//Schema for Message
var msgSchema = new Schema({
    toUser: String,
    fromUser: String,
    body: String,
    date: String
});
var Messages = mongoose.model('Msgs', msgSchema);


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


function doesUserHaveSession(username){
  console.log("Checking session");

  return (username in sessions)
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
              var toHash = pss + result[0].salt;
              var hash = crypto.createHash('sha512');
              data = hash.update(toHash, 'utf-8');
              attmpt = data.digest('hex');
              if(attmpt == result[0].hash){
                createSession(user);
                res.cookie("login", {username: user, name: result[0].name, profilePicture: result[0].profilePicture,
                    id: result[0].id},{maxAge: 300000}); //5 minute cookie life
                res.send('success');
              }
              else{
                res.send('INCORRECT LOGIN ATTEMPT');
              }
            }
        }
    });
});

app.post('/create/account', upload.single('photo'), (req, res) => {
  if (req.file) {
    pass = req.body.password;
    var nacl = Math.floor(Math.random() * 1000000000000000);
    var toHash = pass + nacl;
    var hash = crypto.createHash('sha512');
    data = hash.update(toHash, 'utf-8'); // would methods be skippin cause async ?
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
                profilePicture: req.file.filename,
		            followers: [],
		            following: [],
		            likes: [],
		            posts: []
            });
            entry.save((err) => {
                if(err){
                    console.log('ERROR CREATING NEW USER');
                    res.send('ERROR CREATING NEW USER');
                }
                res.redirect('/app/index.html')
            });
        }
        else{
            res.end('USERNAME ALREADY IN USE');
        }
    });
  }
  else throw 'error';
});

app.post('/create/post', upload.single('photo'), (req, res) => {
  var c = req.cookies;
  if (c && c.login) {
    var username = c.login.username;
    if (checkSession(username)){
      //▼ returns a string mm/dd/yyyy, hh:mm:ss AM/PM ▼
      console.log(req.body);
      var postTime = (new Date(Date.now())).toLocaleString();
      var ident = req.cookies.login.id;
      var user = req.cookies.login.username;
      var name = req.cookies.login.name;
      var pp = req.cookies.login.profilePicture;
      var posts;
      Users.findOne({'username':user}).exec((err, result) => {
          if(err){
              console.log('ERROR');
          }
          posts = result.posts;
          if (req.file) {
            var entry = new Posts({
                author: ident,
                username: user,
                name: name,
                profilePicture: pp,
                body: req.body.text_content,
                image: req.file.filename,
                date: postTime,
                likeCount: 0,
                likeBy: [],
                comments: []
            });
            entry.save((err) => {
                if(err){
                    console.log('ERROR SAVING POST AT DB');
                    res.send('ERROR SAVING');
                }
                posts.push(entry._id);
                result.save((err) => {
                    if(err){
                        console.log('ERROR');
                        res.send('ERROR');
                    }
                    else{
                        console.log('post SUCCESSFUL');
                        res.redirect('/account/home.html');
                    }
                });
            });
          } else {
            var entry = new Posts({
                author: ident,
                username: user,
                name: name,
                profilePicture: pp,
                body: req.body.text_content,
                image: undefined,
                date: postTime,
                likeCount: 0,
                likeBy: [],
                comments: []
            });
            entry.save((err) => {
                if(err){
                    console.log('ERROR SAVING POST AT DB');
                    res.send('ERROR SAVING');
                }
                posts.push(entry._id);
                result.save((err) => {
                    if(err){
                        console.log('ERROR');
                        res.send('ERROR');
                    }
                    else{
                        console.log('post SUCCESSFUL');
                        res.redirect('/account/home.html');
                    }
                });
            });
          }
      });
    } else {
      console.log("1 issue");
      res.redirect('/app/index.html');
    }
  } else {
    console.log("2 issue");
    res.redirect('/app/index.html');
  }});

    //will assume like-button has info used in like method ie onClickfunc(objectID) that gets send with the req
    app.post('/account/like/post', (req, res) => {
      var c = req.cookies;
      if (c && c.login) {
        var user = c.login.username;
        if (checkSession(user)){
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
                  result.save((err) => {
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
        } else {
          res.redirect('/account/home.html');
        }
      } else {
        res.redirect('/account/home.html');
      }
  });

//getting all the posts
app.get('/account/get/posts', (req, res) => {
  var c = req.cookies;
  if (c && c.login) {
    var username = c.login.username;
    if (checkSession(username)){
      curIdent = req.cookies.login.id;
      curUser = req.cookies.login.username;
      Posts.find({}).exec((err, results) => {
          if(err){
              console.log('PROBLEM GETTING ALL POSTS');
              res.send('PROBLEM GETTING ALL POSTS');
          }
          else{
              // /*
              Users.findOne({'username': curUser}).exec((err, acUser) => {
                  if(err){
                      console.log('Error filtering through posts');
                      acUser.end('Error filtering through posts');
                  }
                  else{
                      for(let i=0; i < results.length; i++){
                          if(results[i].username == acUser.username){
                              continue;
                          }
                          else if(acUser.length != 0 && acUser.following.includes(results[i].author)){
                              continue;
                          }
                          else{
                              results.splice(i,1);
                          }
                      }
                      console.log('GETTING ALL POSTS SUCCESSFUL');
                      res.send(JSON.stringify(results, null, 2));
                  }
              });
          }
      });
    } else {
      res.redirect('/app/index.html');
    }
  } else {
    res.redirect('/app/index.html');
  }
});

app.post('/account/comment/post', (req, res) => {
  var c = req.cookies;
  if (c && c.login) {
    var username = c.login.username;
    if (checkSession(username)){
      var name = c.login.name;
      var commentTime = (new Date(Date.now())).toLocaleString();
      Posts.findOne({'_id':req.body.id}).exec((err, result) => {
          if(err){
              console.log('ERROR CHECKING IF USERNAME AVAILABLE');
          }
          console.log("RESULT!");
          console.log(result);
          if(result){
              var entry = new Comments({
                  name: name,
                  username: username,
                  body: req.body.commentContent,
                  date: commentTime
              });
              entry.save((err) => {
                  if(err){
                      console.log('ERROR CREATING NEW USER');
                      res.send('ERROR CREATING NEW USER');
                  }
                  result.comments.push(entry._id);
                  result.save((err) => {
                      if(err){
                          console.log('ERROR SAVING comment TO post');
                          res.send('ERROR SAVING comment TO post');
                      }
                      else{
                          res.send('success')
                      }
                  });
              });
          }
          else{
              res.end('USERNAME ALREADY IN USE');
          }
      });
    } else {
      console.log("boobies1");
      res.redirect('/app/index.html');
    }
  } else {
    console.log("boobies2");
    res.redirect('/app/index.html');
  }
});

/*
Follow a user, fetching followers + following, and Likes for user
*/
//will assume follow button has somethin like onClickfunc(objectID) that gets send with the req
app.post('/app/follow/user', (req, res) => {
  var c = req.cookies;
  if (c && c.login) {
    var user = c.login.username;
    if (checkSession(user)){
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
                      target.followers.push(curUser._id)
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
    } else {
      console.log("titties1");
      res.redirect('/app/index.html');
    }
  } else {
    console.log("titties1");
    res.redirect('/app/index.html');
  }
});

app.get('/account/get/accountInfo', (req, res) => {
  var c = req.cookies;
  if (c && c.login) {
    var user = c.login.username;
    if (checkSession(user)){
      Users.findOne({'username': user}).populate('posts').exec((err, result) => {
          if (err){
            res.send("ERROR");
          } else {
            res.send(JSON.stringify(result));
          }
      });
    } else {
      res.redirect('/app/index.html');
    }
  } else {
    res.redirect('/app/index.html');
  }
});

app.get('/account/get/suggestedFollowing', (req, res) => {
  var c = req.cookies;
  if (c && c.login) {
    var user = c.login.username;
    if (checkSession(user)){
      var user = req.cookies.login.username;
      Users.findOne({'username': user}).populate('following').exec((err, result) => {
          if (err){
            res.send("ERROR");
          } else {
            Users.find({}).exec((err, results) => {
              var array = [];
              for (let i = 0; i < results.length; i++){
                if(results[i].username === user){
                  continue;
                } else {
                  var following = result.following;
                  var bool = true;
                  for (let j = 0; j < following.length; j++){
                    if (results[i].username === following[j].username){
                      bool = false;
                    }
                  }
                  if (bool){
                    array.push(results[i]);
                  }
                }
              }
              res.send(JSON.stringify(array));
            });
          }
      });
    } else {
      res.redirect('/app/index.html');
    }
  } else {
    res.redirect('/app/index.html');
  }
});

app.get('/get/user', (req, res) => {
  var c = req.cookies;
  if (c && c.login) {
    var username = c.login.username;
    if (checkSession(username)){
      res.end(JSON.stringify(c.login));
    } else {
      res.redirect('/index.html');
    }
  } else {
    res.redirect('/index.html');
  }
});

app.use(express.static('public_html'));
app.use(express.static('uploads/images'));

app.listen(port, () => console.log("App is listening"));
