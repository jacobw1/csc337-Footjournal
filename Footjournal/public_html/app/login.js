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
    $.ajax({
        url: '/app/login/',
        data: jData,
        method: 'GET',
        contentType: 'application/json',
        success: (result) => {
            if(result == 'success'){
                window.location.href = '/account/home.html';
            }
            else{
                $('error_message').html('Error: Please check username or password');
//i clear the fields but if we do decide to carry this over to the create acc page we can delete
                $('#username').val('');
                $('#password').val('');
            }
        }
    });
}

//here you probably need a form data thing for multer ****
//have an alert to signify any issue but if we want to go a more subtle route its cool
function createUser(){
    /*
    let deno = $('name').val();
    let user = $('#username').val();
    let pass = $('#password').val();
    let bday = $('birthday').val();
    var jData = JSON.stringify({name:deno, username:user, password:pass, birthday:bday});
    */
    newAcc = new FormData($('#accCreate')); //add a <form></form> in html ? 
    $.ajax({
        url: '/app/create/',
        data: newAcc,
        method: 'POST',
        processData: false,
        contentType: false,
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
