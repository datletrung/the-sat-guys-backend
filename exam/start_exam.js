window.onload = timerRender();
window.onload = publisher(null, null, true);

$("#reset-btn").click(resetExam);
$("#submit-btn").click(submitExam);
$("#exit-btn").click(endExam);
$("#ok-btn").click(okBtn);

var MQ = MathQuill.getInterface(2);

fr_mathquill = new Object();

function showImg(e) {
	$("#modal-container").css("display", "block");
	$("#modal-img").prop("src", e.src);
}

//-----------check if timer is set---------
function okBtn() {
	$("#main-body").prop("class", "main-body");
	$(".loader").hide();
	if (!timerIsSet) {
		timerIsSet = true;
		$("#main").html("");
		fetchQuestion();
		timerHours = parseInt($("#hours-input").val());
		timeMinutes = parseInt($("#minutes-input").val());
		$("#set-timer-container").remove();
		timer(timerHours, timeMinutes, 2);
	}
}

//------prompt user to set timer--------
function timerRender() {
	timerIsSet = false;
	document.querySelector(".set-timer").addEventListener("click", (e) => {
		document.querySelector(".minutes-input").focus();
	});

	document.querySelector(".minutes-input").addEventListener("input", (e) => {
		var time =
			document.querySelector(".hours-input").value + e.target.value;
		time = time.replace(/[^0-9]/g, "");
		while (time.length < 4) time = "0" + time;
		document.querySelector(".hours-input").value = time.substring(
			time.length - 4,
			time.length - 2
		);
		document.querySelector(".minutes-input").value = time.substring(
			time.length - 2,
			time.length
		);
	});
}

//-----reset the exam------
function resetExam() {
	$("#main").html("");
	displayQuestion(questionData);
	$("#submit-btn").prop("disabled", false);
	window.scrollTo(0, 0);
}

//----submit the exam------
function submitExam(endExam = false) {
	//console.log("Submit");
	if (typeof x !== "undefined") {
		clearInterval(x);
	}
	$("#main-body").prop("class", "main-body-blurred");
	$(".loader").show();
	$("#submit-btn").prop("disabled", true);

	response_list = [];
	var tmp_list = [];
	document.querySelectorAll("textarea").forEach((input) => {
		if (input.id != "real-name"){
			input.disabled = true;
		}
	})
	document.querySelectorAll("input, .free-response").forEach((input) => {			
		let id = input.id;
		if (id == "real-name" || id == "email" || id == "title" || id == "message"){
			return;
		}

		$("#" + id).prop("disabled", true);
		if ((id.match(/_/g) || []).length == 2) {
			//------button
			id = id.substring(0, id.length - 1);
			if (!tmp_list.includes(id)) {
				//--no duplicate choice
				tmp_list.push(id);
				var tmp = document.querySelectorAll(
					"input[type=radio][id*=" + id + "]:checked"
				);
				if (tmp.length != 0) {
					//----if user check a box
					let response = tmp[0].id;
					response = response.substring(
						response.length - 1,
						response.length
					);
					response_list.push(response);
				} else {
					//-----if user select nothing
					response_list.push("");
				}
			}
		} else {
			let value = fr_mathquill[id].latex();
			if (value == "") {
				response_list.push("<No answer>");
			}
			else {
				response_list.push(value);
			}
		}
	});
	//-----------------

	var current_time = new Date().getTime();
	var distance = current_time - start_time;
	current_time = current_time.toString();
	current_time = current_time.substr(0, current_time.length - 3);

	//---------calculate total time
	var hours = Math.floor(
		(distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
	);
	var minutes = Math.floor(
		(distance % (1000 * 60 * 60)) / (1000 * 60)
	);
	var seconds = Math.floor((distance % (1000 * 60)) / 1000) - 1; // minux offset time
	var time = ("0" + hours).slice(-2)+":"+("0" + minutes).slice(-2)+":"+("0" + seconds).slice(-2);

	$.ajax({
		type: "post",
		url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"mark_exam.php",
		dataType: "json",
		data: {
			request: "submit_exam",
			current_time: current_time,
			question_id_list: question_id_list,
			response_list: response_list,
			time: time,
			exam_id: base64_id,
			part: part,
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
			if (data.status == 200) {
				var result = data.result;
				var correct_answer = data.correct_answer;
				var correct_num = 0;

				for (let i = 0; i < result.length; i++) {
					if (
						document.querySelectorAll(
							"input[id*='answer_" + (i + 1) + "_'][type='radio']"
						).length
					) {
						//----if radio button is found
						if (result[i] == "wrong") {
							let is_checked = false;
							document
								.querySelectorAll(
									"input[id*='answer_" +
										(i + 1) +
										"_']:checked"
								)
								.forEach((input) => {
									is_checked = true;
									let parent_element = $(
										"#" + input.id
									).parent();
									parent_element.prop(
										"class",
										"checkmark-container checkmark-container-wrong"
									);
									let children_element =
										parent_element.children();
									children_element =
										Object.values(children_element);
									children_element.forEach((e) => {
										if (e.outerHTML) {
											if (e.outerHTML.includes("<span")) {
												e.classList.add(
													"checkmark-wrong"
												);
												return;
											}
										}
									});
								});
							if (!is_checked) {
								document
									.querySelectorAll(
										"input[id*='answer_" + (i + 1) + "_']"
									)
									.forEach((input) => {
										is_checked = true;
										let parent_element = $(
											"#" + input.id
										).parent();
										parent_element.prop(
											"class",
											"checkmark-container checkmark-container-wrong"
										);
										let children_element =
											parent_element.children();
										children_element =
											Object.values(children_element);
										children_element.forEach((e) => {
											if (e.outerHTML) {
												if (
													e.outerHTML.includes(
														"<span"
													)
												) {
													e.classList.add(
														"checkmark-wrong"
													);
													return;
												}
											}
										});
									});
							}
						} else {
							correct_num++;
						}
						//-----display correct answer no matter user's choice is correct or not
						let id = "answer_" + (i + 1) + "_" + correct_answer[i];
						let parent_element = $("#" + id).parent();
						parent_element.prop(
							"class",
							"checkmark-container checkmark-container-correct"
						);
						let children_element = parent_element.children();
						children_element = Object.values(children_element);
						children_element.forEach((e) => {
							if (e.outerHTML) {
								if (e.outerHTML.includes("<span")) {
									e.classList.add("checkmark-correct");
									return;
								}
							}
						});
					} else { //-----------free-response
						if (result[i] == "correct") {
							correct_num++;
							$("#answer_" + (i + 1)).prop(
								"class",
								"free-response answer-input answer-input-correct mq-editable-field mq-math-mode"
							);
						} else {
							$("#answer_" + (i + 1)).prop(
								"class",
								"free-response answer-input answer-input-wrong mq-editable-field mq-math-mode"
							);
							//--------display correct answer next to it
							let parent_element = $(
								"#answer_" + (i + 1)
							).parent()[0];
							let node =
								"<br><p class='correct-answer'>Correct answer: " +
								correct_answer[i].replaceAll("|-*-|", " or ") +
								"</p>";
							parent_element.insertAdjacentHTML(
								"beforeend",
								node
							);
						}
					}
				}
				var score = correct_num+"/"+correct_answer.length;
				tmp = `
					<p>Total time: ${time}.</p>
					<p>Your score is ${score}.</p>
				`;
				$("#msg").html(tmp);
				$("#msg").parent()[0].style.display = "block";
				MathJax.typeset();
				publisher({
							partName: part,
							score: score,
							time: time,
						},
						base64_id
				);
			} else if (data.status == 502) {
				if (data.errorMessage != null) {
					if (data.errorMessage == "Cannot submit after timer expired or submit more than once!" && endExam){
						window.close();
					} else {
						$("#msg").html("<p_red>"+data.errorMessage+"</p_red");
						$("#msg").parent()[0].style.display = "block";	
					}
				}
			}
		},
	});
}

//---------end exam----------
function endExam(){
	$("#ok-btn").click(function(){
		window.open("", '_self').window.close();
	});
	submitExam(true);
}

//----timer-----
function timer(h, m, s) {
	if (typeof x !== "undefined") {
		clearInterval(x);
	}
	countdown = new Date();
	countdown.setHours(countdown.getHours() + h);
	countdown.setMinutes(countdown.getMinutes() + m);
	countdown.setSeconds(countdown.getSeconds() + s);

	var now_tmp = new Date().getTime();
	start_time = now_tmp;
	now_tmp = now_tmp.toString();
	now_tmp = now_tmp.substr(0, now_tmp.length - 3);
	var countdown_tmp = countdown.getTime();
	countdown_tmp = countdown_tmp.toString();
	countdown_tmp = countdown_tmp.substr(0, countdown_tmp.length - 3);

	$.ajax({
		type: "post",
		url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"mark_exam.php",
		dataType: "json",
		data: {
			request: "start_exam",
			start_time: now_tmp,
			end_time: countdown_tmp,
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
			if (data.status == 200) {
				//console.log("Send timer to server successfully!");
			} else if (data.status == 502) {
				$("#msg").html("<p_red>"+data.errorMessage+"</p_red");
				$("#msg").parent()[0].style.display = "block";
			}
		},
	});

	x = setInterval(function () {
		var now = new Date().getTime();
		var distance = countdown - now;
		var hours = Math.floor(
			(distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
		);
		var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
		var seconds = Math.floor((distance % (1000 * 60)) / 1000);
		// If the count down is over, write some text
		if (distance >= 301000) {
			// ----- five last second
			document.getElementById("timer").innerHTML = `
				<p_green>You have: ${hours}h ${minutes}m ${seconds}s</p_green>
			`;
		} else if (distance >= 0) {
			document.getElementById("timer").innerHTML = `
				<p_red>You have: ${hours}h ${minutes}m ${seconds}s</p_red>
			`;
		} else {
			document.getElementById("timer").innerHTML =
				"<p_red>Your time has expired!</p_red>";
			submitExam();
		}
	}, 1000);
}

//----resize input------
function resizeInput(e) {
	if ($("#" + e).val() == "") {
		$("#" + e).prop("size", 18);
	} else {
		$("#" + e).prop("size", $("#" + e).val().length + 6);
	}
}

//-------fetch question---------
function fetchQuestion() {
	let searchParams = new URLSearchParams(window.location.search);
	if (searchParams.has("id") && searchParams.has("part")) {
		var id = searchParams.get("id");
		base64_id = id;
		part = searchParams.get("part");
		$.ajax({
			type: "post",
			url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"request_exam.php",
			dataType: "json",
			data: {
				request: "request_exam",
				id: id,
				exam_part: part,
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
				if (data.status == 200) {
					questionData = data.data;
					questionData = Object.keys(questionData).sort().reduceRight(
						(obj, key) => { 
							obj[key] = questionData[key];
							return obj;
							}, 
						{}
					);
					displayQuestion(questionData);
				} else if (data.status == 502) {
					$("#msg").html("<p_red>"+data.errorMessage+"</p_red");
					$("#msg").parent()[0].style.display = "block";
				}
			},
		});
	} else {
		alert("Invalid parameter!");
	}
}

function displayQuestion(data) {
	question_id_list = [];
	$("#main").append("<br><br>");
	for (const idx in data){
		e = data[idx];
		var question_id = e[0];
		var question = e[1];
		var answer = e[2];
		var answer_type = e[3];
		var image_data = e[4];

		//-----------random order of questions-----------
		for (let i = question.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[question_id[i], question_id[j]] = [question_id[j], question_id[i]];
			[question[i], question[j]] = [question[j], question[i]];
			[answer[i], answer[j]] = [answer[j], answer[i]];
			[answer_type[i], answer_type[j]] = [answer_type[j], answer_type[i]];
			[image_data[i], image_data[j]] = [image_data[j], image_data[i]];
		
		}
		question_id_list = question_id_list.concat(question_id);
		//---------display everything-------------
		switch(idx) {
			case 'mc':
				$("#main").append("<center><h2>Multiple Choice</h2></center>");
				break;
			case 'fr':
				$("#main").append("<center><h2>Free Response</h2></center>");
				break;
			default:
				console.log("oops");
				return;
		}
		$("#main").append("<hr><br><br>");
		for (let i = 0; i < question.length; i++) {
			var tmp_image_data = image_data[i].split(",");
			var tmp = `
				<div class="question-container" id="question_${i + 1}">
					<div class="question-info">
						<table>
							<tbody>
								<tr>
									<td class="question-number">${i + 1}. </td>
									<td class="question-content">
									${question[i]}
									${
										tmp_image_data[0] !== "" ? `
										<div>
											<img class="center-img" onclick="showImg(this);" src="${tmp_image_data[0]}" />
											<div><center><i><small>Note: Click on the picture to view full size</small></i></center></div>
										</div>
									` : ""}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<br>
				</div>
			`;
			$("#main").append(tmp);
			tmp = "";
			
			if (answer_type[i] == "mc") {
				answer_content = answer[i].split("|-*-|");
				var tmp = `
					<table class="answer-table">
						<tbody>
							${[[0, 2], [1, 3]].map(row => `
								<tr>
									${row.map(idx => `
										<td class="answer-table-container">
											<label class="checkmark-container">
												${answer_content[idx] + (tmp_image_data[idx + 1] ? `
													<div>
														<img style='width:100%;max-width:300px;' src='${tmp_image_data[idx + 1]}'/>
														<div><center><i><small>Note: Click on the picture to view full size</small></i></center></div>
													</div>
												` : "")}
												<input type="radio" name="answer_${i + 1}" id="answer_${i+1}_${idx + 1}" />
												<span class="checkmark"></span>
											</label>
										</td>
									`).join('')}
								</tr>
							`).join('')}
						</tbody>
					</table>
				`;
				$("#main").append(tmp);
			} else if (answer_type[i] == "fr") {
				try{
					var offset = data["mc"][0].length;
				} catch(e) {
					var offset = 0;
				}
				var tmp = `
					<div class="answer-single-container">
						<div style="display: flex; align-items: center;">
							<div style="margin-right: 10px;">${answer[i] === "|-*-|" ? 
								"Answer: " : 
								answer[i].substring(0, answer[i].indexOf("|-*-|"))
							}</div>
							<p style="flex-grow: 1;">
								<span class="free-response" id="answer_${offset + i + 1}"></span>
							</p>
						</div>
					</div>
				`;
				$("#main").append(tmp);
				var mathField = MQ.MathField(
					document.querySelector(`span#answer_${offset + i + 1}`),
					{}
				);
				fr_mathquill[`answer_${offset + i + 1}`] = mathField;
			}
			$("#main").append("<br><br><hr><br><br>");
		}
	}
	MathJax.typeset();
	injectMathQuill();
	timer(timerHours, timeMinutes, 2);	
}

/*------------BEGIN INJECT LATEX TO MOST RECENT TEXTAREA------------*/
var currentFocus = null;

function injectMathQuill() {
	document.querySelectorAll("textarea").forEach((obj) => {
		obj.addEventListener("focusin", (e) => {
			currentFocus = e.target.parentElement.parentElement.id;
		});
	});
}
/*------------END INJECT LATEX TO MOST RECENT TEXTAREA------------*/

//------------Begin Math Notation-----------
let notation_button = document.querySelectorAll("td.pad-button");
notation_button.forEach((obj) => {
	obj.addEventListener("click", () => {
		var mathField = fr_mathquill[currentFocus];
		mathField.write(obj.getAttribute("data-append"));
		mathField.moveToRightEnd();
		mathField.focus();
		for (let i = 0; i < parseInt(obj.getAttribute("data-moveleft")); i++)
			mathField.keystroke("Left");
	});
});
//------------End Math Notation-----------

$("#show-math-keyboard").click(function () {
	$("#show-math-keyboard").hide();
	$("#math-keyboard").show();
});

$("#hide-math-keyboard").click(function () {
	$("#show-math-keyboard").show();
	$("#math-keyboard").hide();
});

//-------------------BEGIN REPORT----------------
$("#submit-report-exam-btn").click(function () {
	var note = {'exam_id': base64_id,
						'question':{
							'origin':{
								'mc':questionData['mc'][0],
								'fr':questionData['fr'][0]
							},
							'mixed':question_id_list
						}};
	var realName = $("#real-name").val();
	var email = $("#email").val();
	var title = $("#title").val();
	var message = $("#message").val();
	var source = window.location.href;
	report(realName, email, title, message, source, note);
});

//-------------------END REPORT----------------

//-------------------PUBLISHER-------------------
/*
function publisher(data){
	const PUBLISHER_URL = `wss://TheSATGuys.gq/publish`;
	if (window.WebSocket) {
		let ws = new WebSocket(PUBLISHER_URL);
		ws.onopen = () => {
			//console.log("Publisher connected");
			ws.send(JSON.stringify(data));
			ws.close();
		};
		
		ws.onerror = (e) => {
			alert("Websocket error. Cannot update your score automatically.");
			console.log(e);
		};

		ws.onclose = () => {
			//console.log("Websocket is closed");
		};
	} else {
		alert("Websocket is not supported on your browser. Cannot update your score automatically.");
	}
}
*/


function publisher(data, exam_id, init=false){
	if (!window.localStorage && init) {
		alert("localStorage is not supported on your browser. Cannot update your score automatically.");
		return;
	}
	if ((!window.localStorage && !init) || init) return;

	ls = localStorage.getItem("TheSATGuyMsg");
	try{
		ls = JSON.parse(ls);
	} catch (error) {
		localStorage.setItem("TheSATGuyMsg", JSON.stringify({
															'exam_id': exam_id,
															}));
		publisher(data, exam_id);
		return;
	}
	if (ls.exam_id != exam_id){ //-------check exam id, if new then write, else (old) delete
		localStorage.setItem("TheSATGuyMsg", JSON.stringify({
															'exam_id': exam_id,
															}));

		publisher(data, exam_id);
		return;
	}
	if ('part' in ls){
		ls["part"].push(JSON.stringify(data));
	} else {
		ls["part"] = [JSON.stringify(data)];
	}
	localStorage.setItem("TheSATGuyMsg", JSON.stringify(ls));
}