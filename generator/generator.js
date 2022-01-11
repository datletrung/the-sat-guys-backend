//-----------------ONLOAD-------------------------
const delayTime = 750;
window.onload = request_topic();
window.onload = updateOption();

function shuffle(array) {
	var currentIndex = array.length, randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}
	return array;
}

//---------------BEGIN FETCH TOPIC-----------------
function request_topic() {
	$.ajax({
		type: "post",
		url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"generator.php",
		dataType: "json",
		data: {
			request: "fetch_topic",
		},
		success: function (data) {
			if (data.status == 200) {
				//console.log(data);
				data = data.data;
				append_topic_cal(data['cal']);
				append_topic_no_cal(data['no_cal']);
				//document.getElementById("loading").style.display = "none";
			} else if (data.status == "502") {
				alert(data.errorMessage);
			}
		},
	});
}
//---------------END FETCH TOPIC-----------------

//---------------BEGIN INPUT-----------------
function append_topic_cal(data) {
	var inputs = document.getElementById("topic_cal");
	var tmp = "";
	data.forEach((obj, idx) => {
		if (idx % 2 == 0) {
			inputs.innerHTML += tmp;
			tmp = "";
		}
		tmp +=
			"<td> \
			<input class='input_topic topic_cal' part='cal' topic='" +
			obj.replaceAll(" ", "_") +
			"' type='number' oninput='updateTotalPartNum(this)' value='' autocomplete='off'> \
			<label class='input_label'>" +
			obj +
			"</label> \
			</td>";
	});
	inputs.innerHTML += tmp;
}

function append_topic_no_cal(data) {
	var inputs = document.getElementById("topic_no_cal");
	var tmp = "";
	data.forEach((obj, idx) => {
		if (idx % 2 == 0) {
			inputs.innerHTML += tmp;
			tmp = "";
		}
		tmp +=
			"<td> \
			<input class='input_topic topic_no_cal' part='no_cal' topic='" +
			obj.replaceAll(" ", "_") +
			"' type='number' oninput='updateTotalPartNum(this)' value='' autocomplete='off'> \
			<label class='input_label'>" +
			obj +
			"</label> \
			</td>";
	});
	inputs.innerHTML += tmp;
}
//---------------END INPUT-----------------

//---------------BEGIN UPDATE TOPIC INPUT-----------------
var debounceTimerTotal;
var debounceTimerPart;

num_ques.oninput = function () {
	$(".mini-loader").show();
	clearTimeout(debounceTimerTotal);
	debounceTimerTotal = setTimeout(() => {
		updatePartTopicNum();
		$(".mini-loader").hide();
	}, delayTime);
};

document.querySelectorAll("input[id^=checkbox][type=checkbox]").forEach((e) => {
	e.addEventListener("input", (_) => {
		var checkbox_list = document.querySelectorAll("input[id^=checkbox][type=checkbox]:checked");
		if (checkbox_list.length == 0) {
			$(".num-topic-container").hide();
		} else {
			updateDisplayPart();
			$(".num-topic-container").show();
		}
		updatePartTopicNum();
	});
});

document.querySelectorAll("button.btn-random").forEach((e) => {
	e.addEventListener("click", (_) => {
		updatePartTopicNum(e.getAttribute("part"));
	});
});

function updateDisplayPart() {
	document.querySelectorAll("input[id^=checkbox][type=checkbox]").forEach(function (e) {
		let part = e.getAttribute("part");
		document.getElementById("part_"+part).style.display = "none";
	});
	document.querySelectorAll("input[id^=checkbox][type=checkbox]:checked").forEach(function (e) {
		let part = e.getAttribute("part");
		document.getElementById("part_"+part).style.display = "block";
	});
}

function updatePartNum(e) {
	$(".mini-loader").show();
	clearTimeout(debounceTimerPart);
	debounceTimerPart = setTimeout(() => {
		var partName = e.getAttribute("part");
		var questionPerPart = parseInt(e.value);
		if (isNaN(questionPerPart)) questionPerPart = 0;

		let topicList = document.querySelectorAll("input.topic_" + partName);
		let topicCount = topicList.length;
		let remainQuestions = questionPerPart % topicCount;
		let questionPerTopic = Math.floor(questionPerPart / topicCount);
		for (let j = 0; j < topicCount; j++) {
			topicList[j].value = questionPerTopic;
			if (j < remainQuestions) topicList[j].value++;
		}
		updateGrandTotalNum();
		$(".mini-loader").hide();
	}, delayTime);
}

function updatePartTopicNum(partName=null) {
	if (partName){
		questionNum = document.getElementById("num_" + partName).value;

		let topicList = document.querySelectorAll("input.topic_" + partName);
		topicList = Array.from(topicList);
		topicList = shuffle(topicList);

		let topicCount = topicList.length;
		let remainQuestions = questionNum % topicCount;
		let questionPerTopic = Math.floor(questionNum / topicCount);
		for (let j = 0; j < topicCount; j++) {
			topicList[j].value = questionPerTopic;
			if (j < remainQuestions) topicList[j].value++;
		}
	} else {
		var num_question = parseInt(num_ques.value);
		if (isNaN(num_question)) num_question = 0;
		let partList = document.querySelectorAll("input[type=checkbox]:checked");
		let partCount = partList.length;
		let remainQuestionsPerPart = num_question % partCount;
		let questionPerPart = Math.floor(num_question / partCount);
		for (let i = 0; i < partCount; i++) {
			var partName = partList[i].getAttribute("part");
			document.getElementById("num_" + partName).value = questionPerPart;
			if (i < remainQuestionsPerPart) {
				document.getElementById("num_" + partName).value++;
			}
			questionNum = document.getElementById("num_" + partName).value;

			let topicList = document.querySelectorAll("input.topic_" + partName);
			topicList = Array.from(topicList);
			topicList = shuffle(topicList);

			let topicCount = topicList.length;
			let remainQuestions = questionNum % topicCount;
			let questionPerTopic = Math.floor(questionNum / topicCount);
			for (let j = 0; j < topicCount; j++) {
				topicList[j].value = questionPerTopic;
				if (j < remainQuestions) topicList[j].value++;
			}
		}
	}
	
	updateGrandTotalNum();
}

function updateTotalPartNum(e) {
	var total = 0;
	var partName = e.getAttribute("part");
	document
		.querySelectorAll("input.topic_" + partName)
		.forEach(function (item) {
			var num = parseInt(item.value);
			if (!isNaN(num)) {
				total += num;
			}
		});
	$("#num_" + partName).val(total);
	updateGrandTotalNum();
}

function updateGrandTotalNum() {
	var total = 0;
	document.querySelectorAll("input.total_per_part").forEach(function (item) {
		if (
			document.getElementById("checkbox_" + item.getAttribute("part"))
				.checked
		) {
			var num = parseInt(item.value);
			if (!isNaN(num)) {
				total += num;
			}
		}
	});
	$("#total_num_ques").html(total);
	initDiff();
}

//---------------END UPDATE TOPIC INPUT-----------------

//---------------BEGIN BUTTON BTN-----------------
okBtn.onclick = function () {
	$(".loader").hide();
	$("#main-body").prop("class", "main-body");
	this.parentElement.style.display = "none";
};

resetBtn.onclick = function () {
	updatePartTopicNum();
};

viewExamBtn.onclick = function () {
	if (redirect_url_view) {
		//window.location.href = redirect_url_view;
		window.open(redirect_url_view, "_blank").focus();
	}
};

startExamBtn.onclick = function () {
	if (redirect_url_start) {
		//window.location.href = redirect_url_start;
		window.open(redirect_url_start, "_blank").focus();
	}
};
//---------------END BUTTON BTN-----------------

//---------------BEGIN DIFF---------------------
document.querySelectorAll("input.input-diff").forEach((e) => {
	e.addEventListener("input", (_) => {
		updateDiff();
	});
});

function initDiff(){
	var numTotal = parseInt($("#total_num_ques").html());
	if (isNaN(numTotal)) numTotal = 0;

	var percentEasy = Math.ceil(60 * numTotal / 100);
	var percentNormal = Math.floor(30 * numTotal / 100);
	var percentHard = numTotal - percentEasy - percentNormal;

	$("#diff_num_easy").val(percentEasy);
	$("#diff_num_normal").val(percentNormal);
	$("#diff_num_hard").val(percentHard);
	updateDiff();
}

function updateDiff(){
	var numEasy = parseInt($("#diff_num_easy").val());
	var numNormal = parseInt($("#diff_num_normal").val());
	var numHard = parseInt($("#diff_num_hard").val());

	if (isNaN(numEasy)) numEasy = 0;
	if (isNaN(numNormal)) numNormal = 0;
	if (isNaN(numHard)) numHard = 0;

	var numTotal = parseInt($("#total_num_ques").html());

	if (isNaN(numTotal) || numTotal==0){
		$("#diff_percent_easy").html(0);
		$("#diff_percent_normal").html(0);
		$("#diff_percent_hard").html(0);
	} else {
		let tmpEasy = (numEasy * 100 / numTotal).toFixed(1);
		let tmpNormal = (numNormal * 100 / numTotal).toFixed(1);
		let tmpHard = (numHard * 100 / numTotal).toFixed(1);
		if (tmpEasy == Math.round(tmpEasy)) tmpEasy = Math.round(tmpEasy);
		if (tmpNormal == Math.round(tmpNormal)) tmpNormal = Math.round(tmpNormal);
		if (tmpHard == Math.round(tmpHard)) tmpHard = Math.round(tmpHard);
		$("#diff_percent_easy").html(tmpEasy);
		$("#diff_percent_normal").html(tmpNormal);
		$("#diff_percent_hard").html(tmpHard);
	}
	$("#diffNumTotal").html(numEasy+numNormal+numHard);
	updateDrawChart();
}

//---------------END DIFF---------------------

//---------------BEGIN CHART--------------------
google.charts.load('current', {
	callback: function () {
		drawChart();
		$(window).resize(updateDrawChart);
	},
	packages:['corechart']
});

// Draw the chart and set the chart values
function drawChart() {
	var numEasy = parseInt($("#diff_num_easy").val());
	var numNormal = parseInt($("#diff_num_normal").val());
	var numHard = parseInt($("#diff_num_hard").val());

	var data = google.visualization.arrayToDataTable([
		['_', '_'],
		['Easy', numEasy],
		['Normal', numNormal],
		['Hard', numHard]
	]);

	var options = {'title':'Difficulty Chart',
					 'colors': ['#68de37', '#e0de37', '#ee0c31'],
	};
	var chart = new google.visualization.PieChart(document.getElementById('piechart'));
	chart.draw(data, options);
}

var debounceTimerChart;
function updateDrawChart() {
	$(".mini-loader").show();
	clearTimeout(debounceTimerChart);
	debounceTimerChart = setTimeout(() => {
		drawChart();
		$(".mini-loader").hide();
	}, delayTime);
};

//---------------END CHART--------------------

//---------------BEGIN DROP BUTTON---------------------
document.querySelectorAll("button.dropdown").forEach((e) => {
	e.addEventListener("click", (_) => {
		const content = document.getElementById(e.getAttribute("hide-item"));
		if (content.style.display === "none") {
			e.style.transform = "rotate(0deg)";
			content.style.display = "block";
		} else {
			e.style.transform = "rotate(180deg)";
			content.style.display = "none";
		}
	});
});
//---------------END DROP BUTTON---------------------

//--------------------BEGIN SETUP OPTION--------------------
document.querySelector("button#submit_strategy").addEventListener("click", (e) => {
	e.preventDefault();
	 
	const specifyStrategy = document.querySelector("input#specify");
	const normalStrategy = document.querySelector("input#normal_strategy");
		
	if (specifyStrategy.checked) { //--------option 1
		document.querySelectorAll("input.input_topic").forEach((obj) => {
			obj.disabled = false;
		});
		
		document.querySelector("#checkbox_no_cal").disabled = false;
		document.querySelector("#checkbox_cal").disabled = false;

		$(".num-topic-container").show();
		updateDisplayPart();
	} else if (normalStrategy.checked) { //--------option 3
		const TOTAL_MATH_QUESTION = 58;
		const TOTAL_READING_QUESTION = 0; // 52
		const TOTAL_WRITING_QUESTION = 0; // 44
		
		document.querySelector("#checkbox_no_cal").checked = true;
		document.querySelector("#checkbox_no_cal").disabled = true;
		 
		document.querySelector("#checkbox_cal").checked = true;
		document.querySelector("#checkbox_cal").disabled = true;
		
		document.querySelector("input#num_ques").value = TOTAL_MATH_QUESTION + TOTAL_READING_QUESTION + TOTAL_WRITING_QUESTION;
		document.querySelector("input#num_ques").disabled = true;
		
		document.querySelectorAll("input.input_topic").forEach((obj) => {
				obj.disabled = true;
			});

		$(".num-topic-container").hide();
	} else { //--------option 2
		document.querySelector("input#num_ques").disabled = false;
		document.querySelector("#checkbox_no_cal").disabled = false;
		document.querySelector("#checkbox_cal").disabled = false;

		document.querySelectorAll("input.input_topic").forEach((obj) => {
			obj.disabled = true;
		});

		$(".num-topic-container").show();
		updateDisplayPart();
	}
	updatePartTopicNum();
	$("#main-body").prop("class", "main-body-blurred");
	$(".loader").show();
	var tmp = "<p_green>Option has been updated.</p_green>";
	$("#msg").html(tmp);
	$("#msg").parent()[0].style.display = "block";
});

function updateOption() {
	$("#main-body").prop("class", "main-body-blurred");
	$(".loader").show();
	setTimeout(function(){
		$("button#submit_strategy").click();
		$("button#okBtn").click();
		$(".loader").hide();
		$("#main-body").prop("class", "main-body");
	}, 1000);
}

//--------------------END SETUP OPTION--------------------

//---------------BEGIN SUBMIT-----------------
function collectData() {
	var numEasy = parseInt($("#diff_num_easy").val());
	var numNormal = parseInt($("#diff_num_normal").val());
	var numHard = parseInt($("#diff_num_hard").val());

	var numTotal = parseInt($("#total_num_ques").html());

	if (numEasy + numNormal + numHard != numTotal){
		$("#main-body").prop("class", "main-body-blurred");
		var tmp = "<p_red><u>Total number of question in Difficulty</u> does not match with <u>Total number of question per Topic</u></p_red>";
		$("#msg").html(tmp);
		$("#msg").parent()[0].style.display = "block";
		return false;
	}

	if (numTotal > 100){
		$("#main-body").prop("class", "main-body-blurred");
		var tmp = "<p_red><u>Total number of question</u> must be less than or equal to 100.</p_red>";
		$("#msg").html(tmp);
		$("#msg").parent()[0].style.display = "block";
		return false;
	}

	let data = {};
	data["numEasy"] = numEasy;
	data["numNormal"] = numNormal;
	data["numHard"] = numHard;

	let partList = document.querySelectorAll("input[type=checkbox]:checked");
	for (let i = 0; i < partList.length; i++) {
		let partName = partList[i].getAttribute("part");
		data[partName] = {};
		let topicList = document.querySelectorAll("input.topic_" + partName);
		data[partName]["_total"] = document.getElementById("num_" + partName).value;
		for (let j = 0; j < topicList.length; j++) {
			let tmp = topicList[j].getAttribute("topic").replaceAll("_", " ");
			data[partName][tmp] = topicList[j].value;
		}
	}
	return data;
}

submitBtn.onclick = function () {
	//----disable a few things before we process
	$("#msg").html("");
	$("#main-body").prop("class", "main-body-blurred");
	$(".loader").show();
	$("#viewExamBtn").attr("disabled", true);
	$("#startExamBtn").attr("disabled", true);
	$("#submitBtn").attr("disabled", true);

	//----get inputs topic----
	var data = collectData();
	if (!data){
		return;
	}

	$.ajax({
		type: "post",
		url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"generator.php",
		dataType: "json",
		data: {
			request: "generate_exam",
			data: data,
		},
		success: function (data) {
			//console.log(data);
			if (data.status == 200) {
				tmp = "<p_green>Exam has been successfully generated!</p_green>";
				$("#msg").html(tmp);
				$("#msg").parent()[0].style.display = "block";
				redirect_url_view =
					location.protocol +
					"//" +
					location.hostname +
					"/exam/view_exam.html?id=" +
					data.id;
				redirect_url_start =
					location.protocol +
					"//" +
					location.hostname +
					"/exam/?id=" +
					data.id;
				$("#viewExamBtn").attr("disabled", false);
				$("#startExamBtn").attr("disabled", false);
			} else if (data.status == 502) {
				//console.log(data.errorMessage);
				tmp = "<p_red>" + data.errorMessage + "</p_red>";
				$("#msg").html(tmp);
				$("#msg").parent()[0].style.display = "block";
			} else {
				console.log("Unknown Error");
				console.log(data);
			}
		},
	});
	$("#submitBtn").attr("disabled", false);
	window.scrollTo(0, document.body.scrollHeight);
};

//---------------END SUBMIT-----------------
