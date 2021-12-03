/*
Dylan Burish, Jacob Williams, Francisco Figueroa
CSC 337
Final Project -- Footjournal
login.js
he file serves as part of the client-side processes in our final_project Footjournal along with its sister file, client.js. It is
responsible for login attempts to the page.
*/

/*
Parameters: None.
login() preforms a GET request containg a login attempt for a prospective user. If successful, the user is then redirect to their 
personal home page, otherwise an error message is then displayed.
*/
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
