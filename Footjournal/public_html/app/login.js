/*
Dylan Burish, Jacob Williams, Francisco Figueroa
CSC 337
Final Project -- Footjournal
login.js
**Short desc. of client-side login process**
*/

//i used jquery but we can change this all if you guys aren't fans of it
function login(){
    let user = $('#username').val();
    let pass = $('#password').val();
    var jData = JSON.stringify({username:user, password:pass});
    $.ajax({
        url: '/app/login/',
        data: jData,
        method: 'POST',
        contentType: 'application/json',
        success: (result) => {
            if(result == 'success'){
                window.location.href = '/account/home.html';
            }
            else{
                $('error_message').html('Error: Please check username or password');
//i clear the login fields here but if we do decide to carry this over to the create acc page we can delete
                $('#username').val('');
                $('#password').val('');
            }
        }
    });
}

//have an alert to signify any issue but if we want to go a more subtle route its cool
function createUser(){
    let user = $('#username').val();
    let pass = $('#password').val();
    var jData = JSON.stringify({username:user, password:pass});
    $.ajax({
        url: '/app/create/',
        data: jData,
        method: 'POST',
        contentType: 'application/json',
        success: (result) => {
            if(result != 'success'){
                alert(result);
            }
            else{
                window.location.href = '/app/index.html';
            }
        }
    });
}