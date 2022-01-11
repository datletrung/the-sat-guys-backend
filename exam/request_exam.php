<?php
/*
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
*/

function requestExam() {
	if ($_POST["request"] == "request_exam"){
		require(__DIR__."/../db_conn.php");
		$examPart = $_POST["exam_part"];
		$base64_id = $_POST["id"];

		if (!$examPart){ //------------if no part is specified (view_exam)
			//---fetch question id---
			$sql = "SELECT `question_id`, `question_type` FROM `generator_log` WHERE `base64_id`=?";
			$stmt = $conn->prepare($sql);
			$stmt->bind_param("s", $base64_id);
			$stmt->execute();
			$result = $stmt->get_result();

			if ($result->num_rows <= 0) {
				$stmt->close();
				$conn->close();
				return json_encode(array(
					'status' => 502,
					'errorMessage' => "Invalid ID: Test cannot be found in the database"
				));
			}

			$data = array();
			
			while ($row = $result->fetch_assoc()){
				$question_id_str = $row['question_id'];
				$question_id = explode(",", $question_id_str);
				sort($question_id);
				
				$question_marks = str_repeat('?, ', count($question_id));
				$question_marks = preg_replace('/, $/', '', $question_marks);
				$types = str_repeat('i', count($question_id));

				#-----fetch question  from id list-----
				$sql1 = "SELECT `question`, `answer`, `answer_type`, `image_data` FROM `ques_ans` WHERE `id` in ($question_marks)";

				$stmt1 = $conn->prepare($sql1);
				$stmt1->bind_param($types, ...$question_id);
				$stmt1->execute();
				$result1 = $stmt1->get_result();
				
				if ($result1->num_rows <= 0) {
					$stmt1->close();
					$stmt->close();
					$conn->close();
					return json_encode(array(
						"status" => 502,
						"errorMessage" => "ID Error: Cannot find any question with given question ID list"
					));
				}
				$question = array();
				$answer = array();
				$answer_type = array();
				$image_data = array();
				
				while ($row1 = $result1->fetch_assoc()){
					array_push($question, $row1['question']);
					array_push($answer, $row1['answer']);
					array_push($answer_type, $row1['answer_type']);
					array_push($image_data, $row1['image_data']);
				}
				$questionType = $row['question_type'];
				if (array_key_exists($questionType, $data)){
					$tmp = $data[$questionType];
					$data[$questionType] = array(array_merge($tmp[0], $question),
												array_merge($tmp[1], $answer),
												array_merge($tmp[2], $answer_type),
												array_merge($tmp[3], $image_data),
											);
				} else {
					$data[$questionType] = array($question, $answer, $answer_type, $image_data);
				}
			}
			array_multisort($answer_type, SORT_DESC, $question, $answer, $image_data);
			$stmt1->close();
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status'=>200,
				'data'=>$data
			));
		} else { //------------start_exam request a particular part
			//---fetch question id---
			$sql = "SELECT `question_id` FROM `generator_log` WHERE `base64_id`=? AND `question_type`=?";
			$stmt = $conn->prepare($sql);
			$stmt->bind_param("ss", $base64_id, $examPart);
			$stmt->execute();
			$result = $stmt->get_result();
			if ($result->num_rows <= 0) {
				$stmt->close();
				$conn->close();
				return json_encode(array(
					'status' => 502,
					'errorMessage' => "Invalid ID: Test cannot be found in the database"
				));
			}

			$data = array();
			
			while ($row = $result->fetch_assoc()){
				$question_id_str = $row['question_id'];
				$question_id = explode(",", $question_id_str);
				sort($question_id);
				
				$question_marks = str_repeat('?, ', count($question_id));
				$question_marks = preg_replace('/, $/', '', $question_marks);
				$types = str_repeat('i', count($question_id));

				#-----fetch question  from id list-----
				$sql1 = "SELECT `question`, `answer`, `answer_type`, `image_data` FROM `ques_ans` WHERE `id` in ($question_marks)";

				$stmt1 = $conn->prepare($sql1);
				$stmt1->bind_param($types, ...$question_id);
				$stmt1->execute();
				$result1 = $stmt1->get_result();
				
				if ($result1->num_rows <= 0) {
					$stmt1->close();
					$stmt->close();
					$conn->close();
					return json_encode(array(
						"status" => 502,
						"errorMessage" => "ID Error: Cannot find any question with given question ID list"
					));
				}
				$question = array();
				$answer = array();
				$answer_type = array();
				$image_data = array();

				while ($row1 = $result1->fetch_assoc()){
					array_push($question, $row1['question']);
					array_push($answer, $row1['answer']);
					array_push($answer_type, $row1['answer_type']);
					array_push($image_data, $row1['image_data']);
					$answer_type_tmp = $row1['answer_type'];
				}
				$data[$answer_type_tmp] = array($question_id, $question, $answer, $answer_type, $image_data);
			}
			asort($data);
			$stmt1->close();
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status'=>200,
				'data'=>$data
			));
		}
	}
}

echo requestExam();
?>