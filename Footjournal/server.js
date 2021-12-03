/*
Dylan Burish, Jacob Williams, Francisco Figueroa
CSC 337
Final Project -- Footjournal
server.js
The file serves as the server-side client for our final project: Footjournal, which may or may not have a
passing resemblance to some other social media platform. Using Express to set up our server-side listening
and being backed by a Mongo database, the project has the functionalities of creating your own personal account,
following different users, posting and like posts in real time, along with a help page, and a message page that
acts as a public forum with two channels. All the different functionalities are backed by static files and dynamic
processes. The login system incorporates a salting and hashing of user information for added security as well as
sessions that are initialised and deleted upon a preset time of five minutes of inactivity. Interaction with other
users is also possible with real-time commenting and the account creation, and posting allows for the upload of
image files.
-- Current Index of Sections (subject to change) --
Line #26:   Imported modules & Globals Section
Line #50:   MongoDB Section
Line #121:  Authentification & User Session Section
Line #199:  User Creation & Log-in Section
Line #285:  Posts and Comments
Line #540:  User Acc page, User following, & User Suggestions
Line #689:  Messaging
*/


/*********  Imported modules & Globals Section    *********/

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
app.use('/account/*', auth);
app.get('/', (req, res) => { res.redirect('/app/index.html')})
var hash = crypto.createHash('sha512'); //hashing algo.
var sessions = new Map();
const MAX_LOGIN_TIME = 300000; //5 minutes


/*********  MongoDB Section  *********/

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
The creation of Schema objects that will act as our skeleton structures to preform entries into our
Mongo database. When the object structure is layed out, a mongoose.model() object is created
that holds our created Schema and then has entering data be modeled against it.
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
    username: String,
    type: String,
    body: String
});
var Messages = mongoose.model('Msgs', msgSchema);


/*********  Authentification & User Session Section   *********/

/*
Parameters: None
filterSessions() creates an instance of a Date object set to the time of its creation and then iterates through
a Map data structure containing users paired to their time of session start. A logic gate check is then preformed
to see if the time the user has spent inactive is greater than the MAX_LOGIN_TIME of 5 minutes.
*/
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


/*
Parameters: username, a String representation of a username associated with an active account
createSession() creates an instance of a Date object set to the time of its creation called 'now', then it sets the 'username'
parameter and now as key, value pairs respectively in the global Map data structure 'sessions'.
*/
function createSession(username){
    var now = Date.now();
    sessions.set(username, now);
    console.log('session created for ' + username);
}

//im assuming that this is deprecated, will wait for dylan to confirm -- will not comment
function doesUserHaveSession(username){
  console.log("Checking session");

  return (username in sessions)
}


/*
Parameters: username, a String representation of a username associated with an active account
checkSession() launches a logic gate testing if the 'username' parameter is associated with a value currently in the
'sessions' map data structure, returning true if it is, false conversely.
*/
function checkSession(username){
    if(sessions.get(username) != undefined){
        return true;
    }
    return false
}


/*
Parameters: req, the request field -- also storer of cookies
            res, the response field
            next, control flow, kicks off next function to execute
auth() firstly confirms cookies are valid then it proceeds to check to see if user-session is valid and if-so updates
their current session, redirects if invalid via 'res'.
*/
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


/*********  User Creation & Log-in Section    *********/

/*
A use of the get() method of our Express app that takes in a username and password string as url parameters for login. It then
queries our database to confirm that the username matches an existing one, and that the password provided combines with our salting
to match our hash value. If so, calls for a user session to be initiated via createSession() and responses to the client-side
that the login attempt was successful. If it does not match, it will return an error message to the client-side.
*/
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


/*
A use of the post() method of our Express app that additionally uses the Multer module to take in FormData objects for account creation.
The method first checks if the file attribute of the req field exists, if so it will grab the inputted password and form a hash using a
salt conprised of a random large number. A query is then preform to ensure that the username is unique, and if so a new User object is
created from the request body fields and the image(req.file.filename). The User is then saved and if successful the user is redirect to the
login screen.
*/
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


/*********  Posts and Comments  *********/

/*
A use of the post method of our Express app, has the Multer module backing to take in image files, in FormData format for post creation.
Firstly the method call tries to verify the existence of the cookie attribute of the request. If valid, creates a Date string of the
current time and subsequently uses information stored inside the cookie attribute to form a new Posts object along with the Date string.
The same process is done with the absence of the image file in the Post object creation following. Upon success the user is redirected
back to the home page.
*/
app.post('/account/create/post', upload.single('photo'), (req, res) => {
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


/*
A use of the post() method of our Express app that initially verifies the existence of cookies in the request field and user session. The
method queries the database for the associated post being liked. When successful the integer representing the like value of a post is
incremented and updated, returning a success msg upon success.
*/
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


/*
A use of the get() method of our Express app that initially verifies the existence of cookies in the request field and user session.
The method call queries for all posts in the database and then filters then according to the current user for only relevant posts.
This would include the user's own posts and posts of those that the user follows.
*/
app.get('/account/get/posts', (req, res) => {
  var c = req.cookies;
  if (c && c.login) {
    var username = c.login.username;
    if (checkSession(username)){
      curIdent = req.cookies.login.id;
      curUser = req.cookies.login.username;
      Posts.find({}).populate('comments').exec((err, results) => {
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
                      res.send(JSON.stringify(results, null, 2)); // <----------- @dylan can u see if results.reverse() to see if we can fake having the most recent posts be the first to be seen like on twitter or something should work because its an array
                      //res.send(JSON.stringify(results.reverse(), null, 2)); <----------- what im talkin bout, since its in FIFO its reverse should be a Queue
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


/*
A use of the post() method of our Express app that initially verifies the existence of cookies in the request field and user session.
A query is then preformed to find the post that the following comment will be attached to, and when found the function, using
information stored in the cookie along with data from the request body and a new Date object string of the creation time, constructs
a new Comments object that is subsequently saved.
*/
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


/*********  User Acc page, User following, & User Suggestions   *********/

/*
A use of the post() method of our Express app that initially verifies the existence of cookies in the request field and user session.
A query is preformed to first locate the current user, then another query is preformed to find the target of the follow action. Once
the target is found, his information is added to the current User's array of followers and conversely the current User is added to
the target's followers. Upon success the information for both users is updated and a success msg is return to the client-side.
*/
app.post('/account/follow/user', (req, res) => {
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


/*
A use of the get() method of our Express app that initially verifies the existence of cookies in the request field and user session.
A query is then preformed to find the current user and a populate method call along with an execute call are preformed to interpret the
object ids of the populate parameter as the objects themselves. These are then returned in JSON format to the client-side.
*/
app.get('/account/get/accountInfo', (req, res) => {
  var c = req.cookies;
  if (c && c.login) {
    var user = c.login.username;
    if (checkSession(user)){
      Users.findOne({'username': user}).populate({path: 'posts', populate: {path: 'comments' }}).exec((err, result) => {
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


/*
A use of the get() method of our Express app that initially verifies the existence of cookies in the request field and user session.
The method call preforms a double query in which the outer one looks for all the users that the current user actively follows and the
inner query finds all the users in the database. The resulting JSON array that is return are all the users that are not actively followed
by the current user.
*/
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


/*
A use of the get() method of our Express app that initially verifies the existence of cookies in the request field and user session.
Utility method used to grab information back from the cookie and into the client-side when needed.
*/
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


/*********  Messaging   *********/

/*
This use of the get method of the Express app creates a query in which all Messages objects associated with the 'general' chat are
returned in JSON string format.
*/
app.get('/account/get/generalposts', (req, res) => {
    Messages.find({'type': 'general'}).exec((err, result) => {
        if(err){
            console.log('Error pulling messages');
            res.end('Error pulling messages');
        }
        else{
            console.log('Getting posts successful');
            res.send(JSON.stringify(result, null, 2));
        }
    });
});


/*
This use of the get method of the Express app creates a query in which all Messages objects associated with the 'other' chat are
returned in JSON string format.
*/
app.get('/account/get/otherposts', (req, res) => {
    Messages.find({'type': 'other'}).exec((err, result) => {
        if(err){
            console.log('Error pulling messages');
            res.end('Error pulling messages');
        }
        else{
            console.log('Getting posts successful');
            res.send(JSON.stringify(result, null, 2));
        }
    });
});

/*
A use of the post() method of our Express app that initially verifies the existence of cookies in the request field and user session.
Afterwards, using information both in the request body and in the request cookie, a new Messages object is create and saved into the
database. In this particular method the object is set to be of part of the 'general' chat subdivision.
*/
app.post('/account/post/general', (req, res) => {
    var c = req.cookies;
    if (c && c.login) {
        var user = c.login.username;
        if (checkSession(user)){
            var text = req.body.body;
            var entry = new Messages({
                username: user,
                type: 'general',
                body: text
            });
            entry.save((err) =>{
                if(err){
                    console.log('Error posting msg to general');
                    res.end('Error posting msg to general');
                }
                else{
                    console.log('Posting to general successful');
                    res.end('success');
                }
            });
        }
        else {
            res.redirect('/app/index.html');
        }
    }
    else {
        res.redirect('/app/index.html');
    }
});


/*
A use of the post() method of our Express app that initially verifies the existence of cookies in the request field and user session.
Afterwards, using information both in the request body and in the request cookie, a new Messages object is create and saved into the
database. In this particular method the object is set to be of part of the 'other' chat subdivision.
*/
app.post('/account/post/other', (req, res) => {
    var c = req.cookies;
    if (c && c.login) {
        var user = c.login.username;
        if (checkSession(user)){
            var text = req.body.body;
            var entry = new Messages({
                username: user,
                type: 'other',
                body: text
            });
            entry.save((err) =>{
                if(err){
                    console.log('Error posting msg to other');
                    res.end('Error posting msg to other');
                }
                else{
                    console.log('Posting to other successful');
                    res.end('success');
                }
            });
        }
        else {
            res.redirect('/app/index.html');
        }
    }
    else {
        res.redirect('/app/index.html');
    }
});

// Calls for the Express method to use our static files and directory containing images
app.use(express.static('public_html'));
app.use(express.static('uploads/images'));

//server start-up call
app.listen(port, () => console.log("App is listening"));
