/*
Dylan Burish, Jacob Williams, Francisco Figueroa
CSC 337
Final Project -- Footjournal
client.js
**Short desc. of client-side processes**
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

function followUser(idOfUser){
  var jData = JSON.stringify({id: idOfUser});
  console.log("Friending attempt!");
  $.ajax({
      url: '/app/follow/user',
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

function buildFriendHTMLDiv(user){
  console.log(user);
  let str = "<div class='post_suggest'>";
  str += "<img src='../" + user.profilePicture + "' alt='test pfp'>";
  str += "<div class='username_suggest'>" + user.name + "</div>";
  str += "<button type='button' class='follow_suggest' onclick='followUser(\"" + user._id.toString() + "\")'" + ">Follow</button>";
  str += "</div>";
  return str;
}


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
  str += "</div>";
  return str;
}

function buildMessagePost(username, text){
  let str = "<div class='message_post'>";
  str += '<h3>' +username+'</h3>';
  str+=  '<div>' +text+ '</div>';
  str += '</div>';
  return str;
}
