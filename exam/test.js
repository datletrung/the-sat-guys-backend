window.onload = fetchQuestion();

//-----print button----
$("#print_btn").click(function () {
	$("#print_btn").hide();
	window.print();
	$("#print_btn").show();
});


function showImg(e){
	$("#modal-container").css("display", "block");
	$("#modal-img").prop("src", e.src);
}


function fetchQuestion() {
	//----fetch question----
	let searchParams = new URLSearchParams(window.location.search);
	if (searchParams.has("exam_id")) {
		var exam_id = searchParams.get("exam_id");
		$.ajax({
			type: "post",
			url: "https://c586omev5e.execute-api.us-east-2.amazonaws.com/thesatguys/examFetchQuestion",
			dataType: "json",
			data: {
				action: "viewExam",
				exam_id: exam_id,
			},
			error: function (request, error) {
				console.log(arguments);
				alert("Can't do because: " + error);
			},
			success: function (data) {
				console.log(data);
				if (data.status == true) {
					var data = data.data;
					//console.log(data);
					for (const idx in data){
						switch(idx) {
							case 'reading':
								$("#main").append("<center><h2>Reading</h2></center>");
								break;
							case 'writing':
								$("#main").append("<center><h2>Writing</h2></center>");
								break;
							case 'cal':
								$("#main").append("<center><h2>Math with Calculator</h2></center>");
								break;
							case 'no_cal':
								$("#main").append("<center><h2>Math without Calculator</h2></center>");
								break;
							default:
								alert("Data error!");
								return;
						}
						for (const e in data[idx]){
							var question = data[idx][e]['question_statement'];
							var answer = data[idx][e]['answer_statement'];
							var answer_type = data[idx][e]['type'];
							var question_image = data[idx][e]['question_image'];
							var answer_image = data[idx][e]['answer_image'];
							//---------display everything-------------
							
							$("#main").append("<hr><br><br>");
							var answerContainer = "";
							if (answer_type == "mc") {
								answerContainer += `
								<table class="answer-table">
									<tbody>
										${[[0, 2], [1, 3]].map(row => `
											<tr>
												${row.map(i => `
													<td class="answer-table-container">
														<b>${String.fromCharCode(65 + i)}. </b>
														${answer[i] + (answer_image[i] ? `
															<div>
																<img 
																	onclick="showImg(this)"
																	style="width: 100%; max-width: 300px;"
																	src="${answer_image[i]}"
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
							else {
								answerContainer = `
									<div class="answer-single-container">
										Answer: ________________
									</div>
								`;
							}

							var containerHtml = `
								<div class="question-container" id="question_${parseInt(e) + 1}">
									<div class="question-info">
										<table>
											<tbody>
												<tr>
													<td class="question-number">${parseInt(e) + 1}. </td>
													<td class="question-content">
														${question}
														${question_image ? `
															<div>
																<img 
																	class="center-img" 
																	onclick="showImg(this)" 
																	src="${question_image}"	
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
								<br><br><hr><br><br>
							`;
							$("#main").append(containerHtml);
						}
					}
					MathJax.typeset();
				} else if (data.status == false) {
					console.log(data.errorMessage);
				}
			},
		});
	} else {
		alert("Invalid parameter!");
	}
}
