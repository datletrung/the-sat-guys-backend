window.onload = request_topic();
window.onload = replaceNewlineTextarea();

statementImage = null;
answer1Image = null;
answer2Image = null;
answer3Image = null;
answer4Image = null;

//-------------OK Button Alert-----------
$("#ok-btn").click(function () {
	$(".loader").hide();
	$("#main-body").prop("class", "main-body");
});

//-------------Replace Enter - New line---------
function replaceNewlineTextarea(){
	document.querySelectorAll("textarea").forEach((obj) => {
		if (obj.className.includes("latex-textarea")) {
			obj.addEventListener("input", (e) => {
				obj.value = obj.value.replaceAll('\n', '<br>');
			});
		}
	});
}


//-----------Add another question----------
function addCorrectAnswer(){
	const frTable = document.querySelector("div.free-response-tb");
	const newCorrectAnswer = document.createElement("div");
	newCorrectAnswer.style.display = "grid";
	newCorrectAnswer.style.gridTemplateColumns = "[first] 15% [second] 75% [third] 10%";
	newCorrectAnswer.innerHTML = `
		<div
			class="free-response-header"
			style="
				grid-column-start: first;
				grid-column-end: second;
				display: flex;
				align-items: center;
			"
		>
			<h3>Correct Answer</h3>
		</div>
		<div
			style="
				grid-column-start: second;
				grid-column-end: third;
			"
		>
			<textarea
				class="answer latex-textarea"
				id="free-response"
				required=""
			></textarea>
		</div>
		<div
			style="
				display: flex;
				align-items: center;
				justify-content: space-around;
			"
		>
			<img
				width="20px"
				height="20px"
				src="images/add.png"
				onclick="addCorrectAnswer();"
			/>
			<img
				width="20px"
				height="20px"
				src="images/remove.png"
				onclick="removeCorrectAnswer(this)"
			/>
		</div>
	`;
	frTable.appendChild(newCorrectAnswer);
	replaceNewlineTextarea();
}

function removeCorrectAnswer(e){
	$(e).parent().parent().remove();
}

//------------ON SUBMIT------------
$("#submit-btn").click(function () {
	$("#main-body").prop("class", "main-body-blurred");
	$(".loader").show();
	$("#submit-btn").prop("disabled", true);
	var status = false;
	var data = "Unknown error!";
	[status, data] = collectData();

	if (!status) {
		alert("Error: " + data);
		$("#main-body").prop("class", "main-body");
		$(".loader").hide();
		$("#submit-btn").prop("disabled", false);
		return false;
	}

	//console.log("Sending data to PHP");
	$.ajax({
		type: "post",
		url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"donate.php",
		dataType: "text",
		processData: false,
		contentType: false,
		cache: false,
		data: data,
		error: function (request, error) {
			console.log(request.responseText);
			console.log(arguments);
			$("#msg").html(
				"<p_red>An error has occurred! Please try again later.</p_red>"
			);
			$("#msg").parent()[0].style.display = "block";
		},
		success: function (data) {
			console.log(data);
			var data = JSON.parse(data);
			//console.log(data);
			if (data.status == 200) {
				clear_form_elements("body");
				$("#msg").html(
					"<p_green>Problem has been successfully imported to database and awaiting approval!</p_green>"
				);
				$("#msg").parent()[0].style.display = "block";
			} else if (data.status == 502) {
				$("#msg").html("<p_red>" + data.errorMessage + "</p_red");
				$("#msg").parent()[0].style.display = "block";
			}
		},
	});
	
	$("#submit-btn").prop("disabled", false);
});

function collectData(checkDataValidity = false) {
	$.fn.isValid = function (file) {
		if (!file){
			return this[0].checkValidity();
		}else{
			return true;
		}
	};

	var formData = new FormData();
	formData.append("request", "submit");

	//-----collect image data--------
	statementImage
		? formData.append("statementImage", statementImage)
		: formData.append("statementImage", "");
	answer1Image
		? formData.append("answer1Image", answer1Image)
		: formData.append("answer1Image", "");
	answer2Image
		? formData.append("answer2Image", answer2Image)
		: formData.append("answer2Image", "");
	answer3Image
		? formData.append("answer3Image", answer3Image)
		: formData.append("answer3Image", "");
	answer4Image
		? formData.append("answer4Image", answer4Image)
		: formData.append("answer4Image", "");

	var imageData = [
		"statementImage",
		"answer1Image",
		"answer2Image",
		"answer3Image",
		"answer4Image",
	];
	formData.append("imageData", imageData);

	if (
		!$("#statement").isValid() ||
		!$("#problem-topic").isValid() ||
		!($("#difficulty").val() >= 1 && $("#difficulty").val() <= 3) ||
		!$("#question-type").isValid()
	) {
		return [false, "One or more fields are empty!"];
	}

	var answerType = $("#answer-type").prop("checked"); // false = multiple choice | true = free response
	var question = $("#statement").val().replace(/\s+/g, " ").trim();
	var topic = $("#problem-topic").val().replace(/\s+/g, " ").trim();
	var difficulty = $("#difficulty").val();
	var questionType = $("#question-type").val();

	switch(questionType) {
		case '1':
			questionType = "reading";
			break;
		case '2':
			questionType = "writing";
			break;
		case '3':
			questionType = "cal";
			break;
		case '4':
			questionType = "no_cal";
			break;
		default:
			return [false, "Invalid question type!"];
	}

	formData.append("answerType", answerType);
	formData.append("questionType", questionType);
	formData.append("question", question);
	formData.append("topic", topic);
	formData.append("difficulty", difficulty);

	if (!answerType) {
		if (
			$("#answer-1").isValid(answer1Image) &&
			$("#answer-2").isValid(answer2Image) &&
			$("#answer-3").isValid(answer3Image) &&
			$("#answer-4").isValid(answer4Image) &&
			$("#correct-answer").val() >= 1 &&
			$("#correct-answer").val() <= 4
		) {
			var tmp = [
				$("#answer-1").val().replace(/\s+/g, " ").trim(),
				$("#answer-2").val().replace(/\s+/g, " ").trim(),
				$("#answer-3").val().replace(/\s+/g, " ").trim(),
				$("#answer-4").val().replace(/\s+/g, " ").trim(),
			];
			formData.append("answer", tmp.join("|-*-|"));
			formData.append("correctAnswer", $("#correct-answer").val());
		} else {
			return [false, "One or more fields are empty!"];
		}
	} else {
		if ($("#free-response").isValid()) {
			formData.append(
				"answer",
				$("#free-response-statement").val().replace(/\s+/g, " ").trim()
			);
		const correctAnswers = Array.from(document.querySelectorAll("#free-response")).map(obj => obj.value.replace(/\s+/g, " ").trim());
			formData.append(
				"correctAnswer",
				// $("#free-response").val().replace(/\s+/g, " ").trim()
				correctAnswers.join("|-*-|")
		);
		} else {
			return [false, "One or more fields are empty!"];
		}
	}
	return [true, formData];
}

//------------Begin Checking Image Upload-------------
function shortenName(s, size) {
	if (s.length > size + 3) {
		var a = s.slice(0, Math.floor(size * 0.4));
		var b = s.slice(-Math.ceil(size * 0.6));
		return a + "..." + b;
	} else {
		return s;
	}
}

function checkImageValidity(file) {
	if (file == null) {
		return false;
	}
	var image_name = file.name;
	var image_extension = image_name.split(".").pop().toLowerCase();
	return jQuery.inArray(image_extension, ["jpg", "jpeg", "png"]) != -1
		? true
		: false;
}

$("input[type=file]").each(function(){
	var id = this.id;
	$("#"+id).change(function () {
		var file = document.getElementById(id).files[0];
		if (checkImageValidity(file)) {
			$("#"+id+"-filename").html(
				shortenName(this.files[0].name, 14)
			);
			switch (id){
				case "statement-image":
					statementImage = file;
					break;
				case "answer-1-image":
					answer1Image = file;
					break;
				case "answer-2-image":
					answer2Image = file;
					break;
				case "answer-3-image":
					answer3Image = file;
					break;
				case "answer-4-image":
					answer4Image = file;
					break;
			}
			updatePreview();
		} else {
			document.getElementById(id).value = "";
			$("#"+id+"-filename").html("No file chosen");
			switch (id){
				case "statement-image":
					statementImage = null;
					break;
				case "answer-1-image":
					answer1Image = null;
					break;
				case "answer-2-image":
					answer2Image = null;
					break;
				case "answer-3-image":
					answer3Image = null;
					break;
				case "answer-4-image":
					answer4Image = null;
					break;
			}
			alert("Invalid image file!\nWe only allow JPG, JPEG, and PNG");
		}
	});
});
//------------End Checking Image Upload-------------

//--------------------BEGIN PREVIEW-------------------------

function openFilePromise(file) {
	const reader = new FileReader();
	return new Promise((resolve, reject) => {
	reader.onerror = () => {
		reader.abort();
		reject();
	}
	reader.onload = () => {
		resolve(reader.result);
	};
	reader.readAsDataURL(file);
	});
}

async function openFile(file) {
	if (window.FileReader) {
		const data = await openFilePromise(file).catch(() => {
		alert("Error: One of your images has been modified/renamed/removed.\nDo not modify your image after uploading.")
	});
		return data;
	} else {
		alert("Your browser does not support previewing");
		return null;
	}
}

var debounceTimerTotal;
const delayTime = 750;

function updatePreview() {
	$(".mini-loader").show();
	clearTimeout(debounceTimerTotal);
	debounceTimerTotal = setTimeout(() => {
		preview();
		$(".mini-loader").hide();
	}, delayTime);
}

async function preview(){	
	var question = $("#statement").val().replace(/\s+/g, " ").trim();
	var answer_type = $("#answer-type").prop("checked");	// false = multiple choice | true = free response
	var image_data = [statementImage && (await openFile(statementImage)),
						answer1Image && (await openFile(answer1Image)),
						answer2Image && (await openFile(answer2Image)),
						answer3Image && (await openFile(answer3Image)),
						answer4Image && (await openFile(answer4Image)),
					];
	var answerContainer = "";
	if (!answer_type) { //----------mc
		answer = [$("#answer-1").val().replace(/\s+/g, " ").trim(),
					$("#answer-2").val().replace(/\s+/g, " ").trim(),
					$("#answer-3").val().replace(/\s+/g, " ").trim(),
					$("#answer-4").val().replace(/\s+/g, " ").trim(),
				];
		var isAnswer = false;
		answer.forEach((e) => {
			if (e){
				isAnswer = true;
			}
		})
		image_data.slice(1).forEach((e) => {
			if (e){
				isAnswer = true;
			}
		})
		if (isAnswer){
			answerContainer = `
				<table class="answer-table">
					<tbody>
						${[[0, 2], [1, 3]].map(row => `
							<tr>
								${row.map(idx => `
									<td class="answer-table-container">
										<b>${String.fromCharCode(65 + idx)}. </b>
										${answer[idx] + (image_data[idx + 1] ? `
											<div>
												<img
													style="width: 100%; max-width: 200px;"
													src="${image_data[idx + 1]}"
												/>
											</div>
										` : "")}
									</td>
								`).join('')}
							</tr>
						`).join('')}
					</tbody>
				</table>
			`;
		}
	}
	else {
		answer = $("#free-response-statement").val().replace(/\s+/g, " ").trim();
		answerContainer = `
			<div class="answer-single-container">
				${(answer == "" ? "Answer: ________________" : answer+": ________________")}
			</div>
		`;
	}

	var containerHtml = `
		<div class="question-container">
			<div class="question-info">
				<table>
					<tbody>
						<tr>
							<td class="question-content">
								${question}
								${image_data[0] ? `
									<div>
										<img 
											class="center-img"
											src="${image_data[0]}"	
										/>
									</div>
								` : ""}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<br>
			${answerContainer} 
		</div>
	`;
	
	$("#preview").html(containerHtml);
	MathJax.typeset();
}
//--------------------END PREVIEW-------------------------

//---------------BEGIN FETCH TOPIC-----------------
function request_topic() {
	$.ajax({
		type: "post",
		url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"donate.php",
		dataType: "json",
		data: {
			request: "fetch_topic",
		},
		error: function (request, error) {
			console.log(request.responseText);
			console.log(arguments);
			$("#main-body").prop("class", "main-body-blurred");
			$("#msg").html(
				"<p_red>An error has occurred! Please try again later.</p_red>"
			);
			$("#msg").parent()[0].style.display = "block";
		},
		success: function (data) {
			if (data.status == 200) {
				//console.log(data);
				append_select(data.data);
				loadDropList();
			} else if (data.status == "502") {
				alert(data.errorMessage);
			}
		},
	});
}
//---------------END FETCH TOPIC-----------------

//---------------BEGIN DROPLIST-----------------
function append_select(data) {
	var selectList = document.getElementById("problem-topic");
	data.forEach((obj, idx) => {
		var tmp = "";
		tmp +=
			"<option value='" +
			obj +
			"'><p>" +
			obj.charAt(0).toUpperCase() +
			obj.slice(1) +
			"</p></option>";
		selectList.innerHTML += tmp;
	});
}
//---------------END DROPLIST-----------------

//------------Math Notation-----------
$(document).mouseup(function (e) {
	var container = $("#math-keyboard");
	if (!container.is(e.target) && container.has(e.target).length === 0) {
		$("textarea").removeClass("currentFocusHighlight");
		$("#show-math-keyboard").show();
		container.hide();
	}
});

var MQ = MathQuill.getInterface(2);

var mathField = MQ.MathField(document.getElementById("math-notation"), {});

$("#show-math-keyboard").click(function () {
	if (currentFocus) {
		currentFocus.classList.add("currentFocusHighlight");
	}
	$("#show-math-keyboard").hide();
	$("#math-keyboard").show();
});

$("#hide-math-keyboard").click(function () {
	$("textarea").removeClass("currentFocusHighlight");
	$("#show-math-keyboard").show();
	$("#math-keyboard").hide();
});

$("#answer-type").change(function () {
	if ($("#answer-type").prop("checked")) {
		$("#answer-multiple-choice").hide();
		$("#answer-free-response").show();
	} else {
		$("#answer-multiple-choice").show();
		$("#answer-free-response").hide();
	}
	updatePreview();
});

/* BEGIN INJECT LATEX TO MOST RECENT TEXTAREA */
var currentFocus = null;
document.querySelectorAll("textarea").forEach((obj) => {
	if (obj.className.includes("latex-textarea")) {
		obj.addEventListener("focusin", (e) => {
			currentFocus = e.target;
		});
		obj.addEventListener("input", (e) => {
			updatePreview();
		});
	}
});
/* END INJECT LATEX TO MOST RECENT TEXTAREA */

//------------Begin Math Notation-----------
let notation_button = document.querySelectorAll("td.pad-button");
notation_button.forEach((obj) => {
	obj.addEventListener("click", () => {
		mathField.write(obj.getAttribute("data-append"));
		mathField.moveToRightEnd();
		mathField.focus();
		for (let i = 0; i < parseInt(obj.getAttribute("data-moveleft")); i++)
			mathField.keystroke("Left");
	});
});

$("#add-notation-btn").click(function () {
	if (currentFocus) {
		let tmp = mathField.latex();
		if ((tmp.slice(0, 3) == "<b>" || tmp.slice(0, 3) == "<i>") && (tmp.slice(-4) == "</b>" || tmp.slice(-4) == "</i>")){
			currentFocus.value += tmp;
		} else {
			currentFocus.value += `\\(${tmp}\\)`;
		}
		updatePreview();
	}
});
//------------End Math Notation-----------

//------------Clear all Input Fields----------
function clear_form_elements(class_name) {
	jQuery("." + class_name)
		.find(":input")
		.each(function () {
			switch (this.type) {
				case "password":
				case "text":
				case "textarea":
				case "file":
				case "select-one":
				case "select-multiple":
				case "date":
				case "number":
				case "tel":
				case "email":
					jQuery(this).val("");
					break;
				case "checkbox":
				case "radio":
					this.checked = false;
					break;
			}
		});
}
//------------Clear all Input Fields----------

//------------Drop List---------------
function loadDropList() {
	var x, i, j, l, ll, selElmnt, a, b, c;
	/*look for any elements with the class "custom-select":*/
	x = document.getElementsByClassName("custom-select");
	l = x.length;
	for (i = 0; i < l; i++) {
		selElmnt = x[i].getElementsByTagName("select")[0];
		ll = selElmnt.length;
		/*for each element, create a new DIV that will act as the selected item:*/
		a = document.createElement("DIV");
		a.setAttribute("class", "select-selected");
		a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
		x[i].appendChild(a);
		/*for each element, create a new DIV that will contain the option list:*/
		b = document.createElement("DIV");
		b.setAttribute("class", "select-items select-hide");
		for (j = 1; j < ll; j++) {
			/*for each option in the original select element,
		create a new DIV that will act as an option item:*/
			c = document.createElement("DIV");
			c.innerHTML = selElmnt.options[j].innerHTML;
			if (!selElmnt.options[j].disabled){
				c.addEventListener("click", function (e) {
					/*when an item is clicked, update the original select box,
				and the selected item:*/
					var y, i, k, s, h, sl, yl;
					s =
						this.parentNode.parentNode.getElementsByTagName(
							"select"
						)[0];
					sl = s.length;
					h = this.parentNode.previousSibling;
					for (i = 0; i < sl; i++) {
						if (s.options[i].innerHTML == this.innerHTML) {
							s.selectedIndex = i;
							h.innerHTML = this.innerHTML;
							y =
								this.parentNode.getElementsByClassName(
									"same-as-selected"
								);
							yl = y.length;
							for (k = 0; k < yl; k++) {
								y[k].removeAttribute("class");
							}
							this.setAttribute("class", "same-as-selected");
							break;
						}
					}
					h.click();
				});
			}
			b.appendChild(c);
		}
		x[i].appendChild(b);
		a.addEventListener("click", function (e) {
			/*when the select box is clicked, close any other select boxes,
			and open/close the current select box:*/
			e.stopPropagation();
			closeAllSelect(this);
			this.nextSibling.classList.toggle("select-hide");
			this.classList.toggle("select-arrow-active");
		});
	}
	function closeAllSelect(elmnt) {
		/*a function that will close all select boxes in the document,
		except the current select box:*/
		var x,
			y,
			i,
			xl,
			yl,
			arrNo = [];
		x = document.getElementsByClassName("select-items");
		y = document.getElementsByClassName("select-selected");
		xl = x.length;
		yl = y.length;
		for (i = 0; i < yl; i++) {
			if (elmnt == y[i]) {
				arrNo.push(i);
			} else {
				y[i].classList.remove("select-arrow-active");
			}
		}
		for (i = 0; i < xl; i++) {
			if (arrNo.indexOf(i)) {
				x[i].classList.add("select-hide");
			}
		}
	}
	/*if the user clicks anywhere outside the select box,
	then close all select boxes:*/
	document.addEventListener("click", closeAllSelect);
}