$("#confirm-password").keypress(function(event){
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
	$("#main-body").prop("class", "main-body-blurred");
	$(".loader").show();
	$("#msg").html();

	let searchParams = new URLSearchParams(window.location.search);
	if (!searchParams.has("usreml")) {
		$("#msg").html(
			"<p_red>Invalid parameter!</p_red>"
		);
		$("#msg").parent()[0].style.display = "block";
		return;
	}

	var user = searchParams.get("usreml");
	var code = searchParams.get("vc");
	var oldPassword = $("#old-password").val();
	var password = $("#password").val();
	var confirmPassword = $("#confirm-password").val();

	if (!password){
		$("#msg").html(
			"<p_red>One or more fields is missing!</p_red>"
		);
		$("#msg").parent()[0].style.display = "block";
		return;
	}
	if (password != confirmPassword){
		$("#msg").html(
			"<p_red>Password missmatch!</p_red>"
		);
		$("#msg").parent()[0].style.display = "block";
		return;
	}

	$.ajax({
		type: "post",
		url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"password.php",
		dataType: "json",
		data: {
			request: "setpwd",
			user: user,
			oldPassword: oldPassword,
			password: password,
			code: code,
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
					"<p_green>Password has been changed successfully!</p_green>"
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
});