/*
Dylan Burish, Jacob Williams, Francisco Figueroa
CSC 337
Final Project -- Footjournal
client.js
The file serves as the bulk of the client-side processes in our final_project Footjournal along with its sister file, login.js. The file is
reponsible for continually fetching posts, comments, and messages as well as user information, and interaction processes between the user, 
posts, and other users, allowing for a dynamic experience on the page catered to a specfic user's session.
*/


/*
Parameters: None.
getPosts() sets up a GET request for the a JSON object containing current user's relevant posts for the home page. When updated, the DOM then
displays Posts after they are formatted via the buildPostHTMLDiv() helper function. 
*/
function getPosts(){
    console.log("Getting posts in client?");
    $.ajax({
        url: '/account/get/posts',
        method: 'GET',
        contentType: 'application/json',
        success: (result) => {
            if (result.charAt(0) === '<'){
              window.location.href = '/app/index.html';
            } else {
              var posts = JSON.parse(result);
              var bigDiv = "<div class='allPosts'>";
              for (i in posts){
                if (posts[i].image === undefined){
                  bigDiv += buildPostHTMLDiv(posts[i], false, true);
                } else {
                  bigDiv += buildPostHTMLDiv(posts[i], true, true);
                }
              }
              bigDiv += "<div>";
              $('#content').html(bigDiv);
            }
        }
    });
}


/*
Parameters: None.
setSuggestedFollowers() sets up a GET request for the a JSON object containing some relevant other user information. Using the helper
function to build the incoming JSON array into html via iterating through element the returned users displayed once the DOM is updated.
*/
function setSuggestedFollowers(){
  console.log("Setting account info in client?");
  $.ajax({
      url: '/account/get/suggestedFollowing',
      method: 'GET',
      contentType: 'application/json',
      success: (result) => {
          if (result.charAt(0) === '<'){
            window.location.href = '/app/index.html';
          } else {
            let users = JSON.parse(result);
            var bigDiv = "Suggested Following <div class='allSuggestions'>";
            for (i in users){
              bigDiv += buildFriendHTMLDiv(users[i]);
            }
            bigDiv += "</div>";
            $('#suggest').html(bigDiv);
        }
      }
  });
}


/*
Parameters: None.
setAccountInfo() sets up a GET request for the a JSON object containing the current user's information. Relevant user information such as 
profile image, following/followers length and username are displayed when updated to the DOM and associated Posts are also returned and 
displayed once the DOM is updated via the buildPostHTMLDiv() helper function.
*/
function setAccountInfo(){
  console.log("Setting account info in client?");
  $.ajax({
      url: '/account/get/accountInfo',
      method: 'GET',
      contentType: 'application/json',
      success: (result) => {
          if (result.charAt(0) === '<'){
            window.location.href = '/app/index.html';
          } else {
            let user = JSON.parse(result);
            console.log(user);
            $('#account_pfp').attr("src", "../" + user.profilePicture);
            $('#account_username').text(user.name);
            $('#account_followers').text("Followers: " + user.followers.length);
            $('#account_following').text("Following: " +user.following.length);

            var posts = user.posts;
            console.log("POSTS: ")
            console.log(posts);
            var bigDiv = "<div class='allPosts'>";
            for (i in posts){
              if (posts[i].image === undefined){
                bigDiv += buildPostHTMLDiv(posts[i], false, false);
              } else {
                bigDiv += buildPostHTMLDiv(posts[i], true, false);
              }
            }
            bigDiv += "</div>";
            $('#account_posts').html(bigDiv);
          }

      }
  });
}


/*
Parameters: None.
setUserInfo() sets up a GET request for the a JSON object containing the current user's information. The image file and username is then 
displayed on the DOM once updated.
*/
function setUserInfo(){
    $.ajax({
        url: '/get/user',
        method: 'GET',
        contentType: 'application/json',
        success: (result) => {
            if (result.charAt(0) === '<'){
              window.location.href = '/app/index.html';
            } else {
              var user = JSON.parse(result);
              $('#post_pfp').attr("src", "../" + user.profilePicture);
              $('.username_post').text(user.name);
            }
        }
    });
}


/*
Parameters: idOfPost, a post's id in String representation
likePost() initially creates a JSON object string containing the parameter of the relevant Post and It then preforms an ajax POST 
request to the serverside to update the the status of the Post like count. Redirects user when successful.
*/
function likePost(idOfPost){
  var jData = JSON.stringify({id:idOfPost});
  console.log("Liking attempt!");
  $.ajax({
      url: '/account/like/post',
      data: jData,
      method: 'POST',
      contentType: 'application/json',
      success: (result) => {
          console.log(result);
          if(result == 'success'){
              window.location.href = '/account/home.html';
          }
          else{
              window.location.href = '/app/index.html';
          }
      }
  });
}


/*
Parameters: idOfPost, a post's id in String representation
commentOnPost() initially sets an id for the comment to be created and then creates a JSON object string containing the parameter and
the content in the comment. It then preforms an ajax POST request to the serverside to update the the status of the Post in relation to a 
newly create comment. Redirects user when successful.
*/
function commentOnPost(idOfPost){
  let htmlID = "comment" + idOfPost;
  var commentContent = $("#" + htmlID).val();
  var jData = JSON.stringify({commentContent:commentContent, id: idOfPost});
  console.log("Commenting attempt!");
  $.ajax({
      url: '/account/comment/post',
      data: jData,
      method: 'POST',
      contentType: 'application/json',
      success: (result) => {
          console.log(result);
          if(result == 'success'){
              window.location.href = '/account/home.html';
          }
          else{
              window.location.href = '/app/index.html';
          }
      }
  });
}


/*
Parameters: idOfUser, the user's id in String representation
followUser() initially creates a JSON object string containing the parameter. It then preforms an ajax POST request to the serverside
to update the relationship between two users. Redirects user when successful.
*/
function followUser(idOfUser){
  var jData = JSON.stringify({id: idOfUser});
  console.log("Friending attempt!");
  $.ajax({
      url: '/account/follow/user',
      data: jData,
      method: 'POST',
      contentType: 'application/json',
      success: (result) => {
          console.log(result);
          if(result == 'success'){
              window.location.href = '/account/home.html';
          }
          else{
              window.location.href = '/app/index.html';
          }
      }
  });
}


/*
Parameters: None.
getGenPosts() preforms a GET request every second to the serverside to update the posts currently on screen for the message page. The helper function
buildMessagePost is then called for each message in the server-side reposonse and the DOM on the 'general' channel  is updated.
*/
function getGenPosts(){
  $.get('/account/get/generalposts', (result) => {
    var genMsgs = JSON.parse(result);
    var msgDiv = '';
    for(msg in genMsgs){
      let cur = genMsgs[msg];
      msgDiv += buildMessagePost(cur.username, cur.body);
    }
    $('#general_content').html(msgDiv);
  });
}
setInterval(getGenPosts, 1000);


/*
Parameters: None.
getOtherPosts() preforms a GET request every second to the serverside to update the posts currently on screen for the message page. The helper function
buildMessagePost is then called for each message in the server-side reposonse and the DOM on the 'other' channel is updated.
*/
function getOtherPosts(){
  $.get('/account/get/otherposts', (result) => {
    var otherMsgs = JSON.parse(result);
    var msgDiv = '';
    for(msg in otherMsgs){
      let cur = otherMsgs[msg];
      msgDiv += buildMessagePost(cur.username, cur.body);
    }
    $('#other_content').html(msgDiv);
  });
}
setInterval(getOtherPosts, 1000);


/*
Parameters: None.
makeGenPost() grabs the currently inputted value from the general text box on the 'general' channel and prefroms a POST request to the server
side, sending through the text body in a JSON object. If successful, text entry field is cleared.
*/
function makeGenPost(){
  var jData = JSON.stringify({body: $('#genText').val()});
  $.ajax({
      url: '/account/post/general',
      data: jData,
      method: 'POST',
      contentType: 'application/json',
      success: (result) => {
        if(result == 'success'){
          console.log('Posting to general successful');
          $('#genText').val('');
        }
        else{
          console.log(result);
          alert(result);
        }
      }
  });
}


/*
Parameters: None.
makeOtherPost() grabs the currently inputted value from the other text box on the 'other' channel and prefroms a POST request to the server
side, sending through the text body in a JSON object. If successful, text entry field is cleared.
*/
function makeOtherPost(){
  var jData = JSON.stringify({body: $('#otherText').val()});
  $.ajax({
      url: '/account/post/other',
      data: jData,
      method: 'POST',
      contentType: 'application/json',
      success: (result) => {
        if(result == 'success'){
          console.log('Posting to other successful');
          $('#otherText').val('');
        }
        else{
          console.log(result);
          alert(result);
        }
      }
  });
}


/*
Parameters: user, JSON object representing an actual user
buildPostHTMLDiv() is a helper function used to construct the proper HTML needed for our posts functionality. Depending on the logic checks
preformed against bool and bool2, functionalites for posts are applied and the <div> is constructed containing relevant information pertaining
to the user.
*/
function buildFriendHTMLDiv(user){
  console.log(user);
  let str = "<div class='post_suggest'>";
  str += "<img src='../" + user.profilePicture + "' alt='test pfp'>";
  str += "<div class='username_suggest'>" + user.name + "</div>";
  str += "<button type='button' class='follow_suggest' onclick='followUser(\"" + user._id.toString() + "\")'" + ">Follow</button>";
  str += "</div>";
  return str;
}


/*
Parameters: post, JSON object representing a user's post
            bool, boolean parameter checking for the existance of an img file
            bool2, checking if the message is being build for home or account page
buildPostHTMLDiv() is a helper function used to construct the proper HTML needed for our posts functionality. Depending on the logic checks
preformed against bool and bool2, functionalites for posts are applied and the <div> is constructed using relevant data concerning the post
passed in.
*/
function buildPostHTMLDiv(post, bool, bool2){
  let str = "<div class='text_post'>";
  str += "<img src='../" + post.profilePicture + "' width='30' height='30'>";
  str += "<div class='username_post'>" + post.name + "</div>";
  str += "<div class='content_post'>" + post.body + "<br>";
  if (bool){
    str += "<img src='../" + post.image + "' width='350' height='250'> <br>";
  }
  str += "</div>";
  str += "<div> Likes: " + post.likeCount + "  " + post.date + "</div>"
  if (bool2){
    str += "<button type='button' class='button_post' onclick='likePost(\"" + post._id.toString() + "\")'" + ">Like</button>";
    str += "<button type='button' class='button_post' onclick='commentOnPost(\"" + post._id.toString() + "\")'" + ">Comment</button>"
    str += "<input type='text' id='comment" + post._id.toString() + "' name='comment' value=''>"
  }
  for (i in post.comments){
    str += "<div class='text_comment'>";
    str += "<h3>" + post.comments[i].name + "</h3>";
    str += "<div class='content_comment'>";
    str += "   " + post.comments[i].body + "</div>";
    str += "</div>";
  }
  str += "</div>";
  return str;
}


/*
Parameters: username, a String representation of a user
            text, a String of text representing a message body
buildMessagePost() is a helper function used to construct the proper HTML needed for our messaging functionality.
*/
function buildMessagePost(username, text){
  let str = "<div class='message_post'>";
  str += '<h3>' +username+'</h3>';
  str+=  '<div>' +text+ '</div>';
  str += '</div>';
  return str;
}
