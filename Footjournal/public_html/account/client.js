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
            console.log(result);
            var posts = JSON.parse(result);
            var bigDiv = "<div id='allPosts'>";
            for (i in posts){
              console.log(posts[i]);
            }
            bigDiv += "<div>";
            $('#content').html(bigDiv);
        }
    });
}


function buildCommentHTMLDiv(post, bool){
  let str = "<div class='text_post'>";
  str += "<img src='" + post.profilePicture + "' width='40' height='40'> <br>";
  str += "<div class='username_post'>" + post.username + "</div>";
  str += "<div class='content_post'>" + post.body + "<br>";
  if (bool){
    str += "<img src='" + post.image + "' width='150' height='150'> <br>";
  }
  str += "</div>";
  str += "<button type='button' class='button_post'>Like</button>"
  str += "<button type='button' class='button_post'>Comment</button>"
  str += "<input type='text' id='comment' name='comment' value=''>"
  str += "</div>";
  return str;
}
