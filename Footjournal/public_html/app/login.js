/*
Dylan Burish, Jacob Williams, Francisco Figueroa
CSC 337
Final Project -- Footjournal
login.js
**Short desc. of client-side login process**
*/

//i used jquery but we can change if you guys aren't fans of it
function login(){
    let user = $('#username').val();
    let pass = $('#password').val();
    var jData = JSON.stringify({username:user, password:pass});
    console.log("Login attempt!");
    $.ajax({
        url: '/app/login/' + user + "/" + pass,
        data: jData,
        method: 'GET',
        contentType: 'application/json',
        success: (result) => {
            if(result == 'success'){
                window.location.href = '/account/home.html';
            }
            else{
                $('#error_message').html('Error: Please check username or password');
            }
        }
    });
}
