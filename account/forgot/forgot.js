function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

$("#user").keypress(function(event){
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
	var user = $("#user").val();

	if (!validateEmail(user)){
		$("#msg").html(
			"<p_red>Invalid email!<br>Please choose a different email address.</p_red>"
		);
		$("#msg").parent()[0].style.display = "block";
		return;
	}

	$.ajax({
		type: "post",
		url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"forgot.php",
		dataType: "json",
		data: {
			request: "forgotpwd",
			user: user,
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
					"<p_green>Please check your email inbox for further instructions.</p_green>"
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