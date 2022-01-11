function validateEmail(email) {
	const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(String(email).toLowerCase());
}

$("#ok-btn").click(function () {
	$(".loader").hide();
	$("#main-body").prop("class", "main-body");
});

$("#submit-report-btn").click(function() {
	var realName = $("#real-name").val();
	var email = $("#email").val();
	var title = $("#title").val();
	var message = $("#message").val();
	var source = window.location.href;
	var note = $("#note").val()==null ? "" : $("#note").val();
	report(realName, email, title, message, source, note);
});

function report(realName, email, title, message, source, note){
	$("#main-body").prop("class", "main-body-blurred");
	$(".loader").show();
	$("#msg").html();
	if (!validateEmail(email)){
		$("#msg").html(
			"<p_red>Invalid email!<br>Please choose a different email address.</p_red>"
		);
		$("#msg").parent()[0].style.display = "block";
		return;
	}

	if (!realName || !title || !message){
		$("#msg").html(
			"<p_red>One or more fields is missing!</p_red>"
		);
		$("#msg").parent()[0].style.display = "block";
		return;
	}

	if (title.length > 100 || message.length > 1000){
		$("#msg").html(
			"<p_red>Title or Message exceeds character limit!</p_red>"
		);
		$("#msg").parent()[0].style.display = "block";
		return;
	}
	
	$.ajax({
		type: "post",
		url: window.location.origin +"/report/report.php",
		dataType: "json",
		data: {
			request: "report",
			realName: realName,
			email: email,
			title: title,
			message: message,
			source: source,
			note: note,
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
					"<p_green>Message has been sent successfully!</p_green>"
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