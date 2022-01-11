document.querySelectorAll("a.sign-in").forEach(function(e){
	e.addEventListener("click", function(event) {
		event.preventDefault();
	}, false);
});

//-----------------BEGIN GOOGLE AUTH--------------------
function onLoadGoogleCallback(){
	gapi.load('auth2', function() {
		auth2 = gapi.auth2.init({
			client_id: '403042058787-n2btraulv3uf6bci3abog9o0favq5d0e.apps.googleusercontent.com',
			cookiepolicy: 'single_host_origin',
			scope: 'profile'
		});

		auth2.attachClickHandler(element, {},
			function(googleUser) {
				var profile = googleUser.getBasicProfile();
				var user = profile.getEmail();
				var token = profile.getId();
				signIn(user, "", token);
			}, function(error) {
				console.error(error);
				$("#main-body").prop("class", "main-body-blurred");
				$(".loader").show();
				$("#msg").html();
				$("#msg").html(
					"<p_red>An error has occurred! Please try again later.</p_red>"
				);
				$("#msg").parent()[0].style.display = "block";
			}
		);
	});
	element = document.getElementById('google-sign-in');
}
//-----------------END GOOGLE AUTH--------------------

//-----------------BEGIN FACEBOOK AUTH--------------------
$("#facebook-sign-in").click(function(){
	facebookSignIn();
});

function facebookSignIn(){
	FB.login(function(response) {
		data = response;
		console.log(response);
		if (response.status === 'connected') {
			onSuccess();
		} else {
			$("#main-body").prop("class", "main-body-blurred");
			$(".loader").show();
			$("#msg").html();
			$("#msg").html(
				"<p_red>An error has occurred! Please try again later.</p_red>"
			);
			$("#msg").parent()[0].style.display = "block";
		}
	}, {scope: 'public_profile, email'});
}

function onSuccess() {
	FB.api('/me?fields=email,id', function(response) {
		var user = response.email;
		var token = response.id;
		signIn(user, "", token);
	});
}
//-----------------END FACEBOOK AUTH--------------------


$("#password").keypress(function(event){
	var keycode = (event.keyCode ? event.keyCode : event.which);
	if (keycode === 13) {
		event.preventDefault();
		$("#submit-btn").click();
	}
});

$("#ok-btn").click(function () {
	$(".loader").hide();
	$("#main-body").prop("class", "main-body");
});

$("#submit-btn").click(function() {
	var user = $("#user").val();
	var password = $("#password").val();
	signIn(user, password, "");
});


function signIn(user, password, token) { //--password or token
	$("#main-body").prop("class", "main-body-blurred");
	$(".loader").show();
	$("#msg").html();

	if (!user){
		$("#msg").html(
			"<p_red>One or more fields is missing!</p_red>"
		);
		$("#msg").parent()[0].style.display = "block";
		return;
	}

	$.ajax({
		type: "post",
		url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"signin.php",
		dataType: "json",
		data: {
			request: "signin",
			user: user,
			password: password,
			token: token,
		},
		error: function (request, error) {
			console.log(request.responseText);
			console.log(arguments);
			$("#msg").html(
				"<p_red>An error has occurred! Please try again later.</p_red>"
			);
			$("#msg").parent()[0].style.display = "block";
		},
		success: function (data) {
			//console.log(data);
			if (data.status == 200){
				$("#msg").html(
					"<p_green>Sign in successfully!</p_green>"
				);
				$("#msg").parent()[0].style.display = "block";
			} else if (data.status == 502) {
				$("#msg").html(
					"<p_red>"+data.errorMessage+"</p_red>"
				);
				$("#msg").parent()[0].style.display = "block";
			}
		}
	});
}