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
	if (searchParams.has("id")) {
		var id = searchParams.get("id");
		$.ajax({
			type: "post",
			url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"request_exam.php",
			dataType: "json",
			data: {
				request: "request_exam",
				id: id,
			},
			error: function (request, error) {
				console.log(arguments);
				alert("Can't do because: " + error);
			},
			success: function (data) {
				console.log(data);
				if (data.status == 200) {
					var data = data.data;
					//console.log(data);
					for (const idx in data){
						e = data[idx];
						var question = e[0];
						var answer = e[1];
						var answer_type = e[2];
						var image_data = e[3];
						/*
						//-----------random order of questions-----------
						for (let i = question.length - 1; i > 0; i--) {
							const j = Math.floor(Math.random() * (i + 1));
							[question[i], question[j]] = [question[j], question[i]];
							[answer[i], answer[j]] = [answer[j], answer[i]];
							[answer_type[i], answer_type[j]] = [answer_type[j], answer_type[i]];
							[image_data[i], image_data[j]] = [image_data[j], image_data[i]];
						
						}
						*/
						//---------display everything-------------
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
								return;
						}
						$("#main").append("<hr><br><br>");
						for (let i = 0; i < question.length; i++) {
							var tmp_image_data = image_data[i].split(",");
							var answerContainer = "";

							if (answer_type[i] == "mc") {
								answer_content = answer[i].split("|-*-|");
								answerContainer = `
									<table class="answer-table">
										<tbody>
											${[[0, 2], [1, 3]].map(row => `
												<tr>
													${row.map(idx => `
														<td class="answer-table-container">
															<b>${String.fromCharCode(65 + idx)}. </b>
															${answer_content[idx] + (tmp_image_data[idx + 1] ? `
																<div>
																	<img 
																		onclick="showImg(this)"
																		style="width: 100%; max-width: 300px;"
																		src="${tmp_image_data[idx + 1]}"
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
										${(answer[i] == "|-*-|" ? "Answer: " : "") + answer[i].replaceAll("|-*-|", "________________")}
									</div>
								`;
							}

							var containerHtml = `
								<div class="question-container" id="question_${i + 1}">
									<div class="question-info">
										<table>
											<tbody>
												<tr>
													<td class="question-number">${i + 1}. </td>
													<td class="question-content">
														${question[i]}
														${tmp_image_data[0] ? `
															<div>
																<img 
																	class="center-img" 
																	onclick="showImg(this)" 
																	src="${tmp_image_data[0]}"	
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
				} else if (data.status == 502) {
					console.log(data.errorMessage);
				}
			},
		});
	} else {
		alert("Invalid parameter!");
	}
}
