<?php
/*
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
*/
session_start();
function main() {
	$threshold = 30;
	$status = 502;
	$result = array();

	if ($_POST["request"] == "start_exam"){
		$start_time = strval($_POST["start_time"]);
		$end_time = strval($_POST["end_time"]);

		$start_time_server = strval(time());

		if ((bccomp($start_time_server - $threshold, $start_time) == -1) && (bccomp($start_time, $start_time_server + $threshold) == -1)){
			$_SESSION['end_time'] = $end_time;
			return json_encode(array(
				'status' => 200
			));
		}
		//----client time and server time does not match
		return json_encode(array(
			'status' => 502,
			'errorMessage' => 'Client time and server time does not match!'
		));

	} else if ($_POST["request"] == "submit_exam"){
		$current_time = strval($_POST["current_time"]);
		$current_time_server = strval(time());

		if (!((bccomp($current_time_server - $threshold, $current_time) == -1) && (bccomp($current_time, $current_time_server + $threshold) == -1))) {
			return json_encode(array(
				'status' => 502,
				'errorMessage' => "Client time and server time does not match!"
			));
		}
		
		$end_time_server = $_SESSION['end_time'];
		if (bccomp($current_time, $end_time_server + $threshold) != -1) {
			return json_encode(array(
				'status' => 502,
				'errorMessage' => "Cannot submit after timer expired or submit more than once!"
			));
		}
		list($status, $result, $correct_answer) = markExam();

		if ($status == 200){
			unset($_SESSION['end_time']); //----only set session invalid if cannot mark the exam
			return json_encode(array(
				'status'=>$status,
				'result'=>$result,
				'correct_answer'=> $correct_answer
			));
		} elseif ($status == 502) {
			return json_encode(array(
				'status'=>$status,
				'errorMessage'=>$result,
			));
		}
		

	}
	
}

function markExam(){
	require(__DIR__."/../db_conn.php");
	$question_id_list = $_POST["question_id_list"];
	$response_list = $_POST["response_list"];

	if (!$question_id_list || !$response_list){
		$conn->close();
		return array(502, 'Invalid request!', "");
	}

	$question_marks = str_repeat('?, ', count($question_id_list));
	$question_marks = preg_replace('/, $/', '', $question_marks);
	$types = str_repeat('i', count($question_id_list));

	$sql = "SELECT id, correct_answer FROM ques_ans WHERE id IN ($question_marks)";
	
	$stmt = $conn->prepare($sql);
	$stmt->bind_param($types, ...$question_id_list);
	$stmt->execute();
	$result = $stmt->get_result();
	
	if ($result->num_rows <= 0) {
		$stmt->close();
		$conn->close();
		return array(502, 'Error at query '.$sql, "");
	}

	$id_list = array();
	$correct_answer_list = array();
	while ($row = $result->fetch_assoc()){
		array_push($id_list, $row['id']);
		array_push($correct_answer_list, $row['correct_answer']);
	}

	//-----now we sort the correct answer array from db to match with the array of answer user submitted
	$tmp = array();
	foreach ($question_id_list as $id){
		array_push($tmp, $correct_answer_list[array_search($id, $id_list)]);
	}
	$correct_answer_list = $tmp;

	if (count($response_list) != count($correct_answer_list)){
		$stmt->close();
		$conn->close();
		return array(502, 'Invalid answer list!', "");
	}

	$result_list = array();
	
	for ($i = 0; $i < count($response_list); $i++){
		$response = str_replace("\\)", "", str_replace("\\(", "", $response_list[$i]));
		$correctAnswer = str_replace("\\)", "", str_replace("\\(", "", $correct_answer_list[$i]));
		if (str_contains($correctAnswer, "|-*-|")) {
			$correctAnswer = explode("|-*-|", $correctAnswer);
			if (in_array($response, $correctAnswer)){
				array_push($result_list, "correct");
			}else{
				array_push($result_list, "wrong");
			}
		} else {
			if ($response == $correctAnswer){
				array_push($result_list, "correct");
			}else{
				array_push($result_list, "wrong");
			}
		}
	}

	//-------------SAVE SCORE INTO DB--------------
	$tmp = array_count_values($result_list)["correct"] == NULL ? 0 : array_count_values($result_list)["correct"];
	$score = $tmp ."/". count($result_list);

	$user = strtolower($_SESSION['user']==null ? 'anonymous' : $_SESSION['user']);
	$exam_id = $_POST['exam_id'];
	$question_type = $_POST['part'];
	$score = $score;
	$time = $_POST['time'];


	$sql = "INSERT INTO user_sub_log(user, exam_id, question_type, score, total_time)
			SELECT ?, ?, ?, ?, ? FROM dual
			WHERE NOT EXISTS (SELECT * FROM user_sub_log WHERE user=? AND exam_id=? AND question_type=?)";
	$stmt = $conn->prepare($sql);
	$stmt->bind_param("ssssssss", $user, $exam_id, $question_type, $score, $time, $user, $exam_id, $question_type);
	$result = $stmt->execute();
	if (!$result) {
		$stmt->close();
		$conn->close();
		return array(502, 'Error at query '.$sql, '');
	}

	$stmt->close();
	$conn->close();
	return array(200, $result_list, $correct_answer_list);
}

echo main();

?>