<?php
function randomString($str_len){
	$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';
	$randstring = '';
	for ($i = 0; $i < $str_len; $i++) {
		$randstring .= $characters[rand(0, strlen($characters)-1)];
	}
	return $randstring;
}

function main(){
	if ($_POST["request"] == "fetch_topic"){
		require(__DIR__."/../db_conn.php");
		$data = array();
		//---fetch topic---
		$sql = "SELECT DISTINCT `topic` FROM `ques_ans` WHERE `base64_id` = \"\" AND `difficulty` = 0 ORDER BY `topic`";
		$result = $conn->query($sql);
	
		if ($result->num_rows <= 0) {
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Error at query '.$sql
			));
		}
	
		while ($row = $result->fetch_assoc()){
			array_push($data, $row['topic']);
		}
	
		$conn->close();
		return json_encode(array(
								'status'=>200,
								'data'=>$data
							));
	} elseif ($_POST['request'] == "submit"){
		require(__DIR__."/../db_conn.php");
		$topic = $_POST['topic'];
		$answerType = $_POST['answerType'] == "true" ? true : false; // false = multiple choice | true = free response
		$questionType = $_POST['questionType'];
		$question = $_POST['question'];
		$answer = $_POST['answer'];
		$correctAnswer = $_POST['correctAnswer'];
		$difficulty = $_POST['difficulty'];
		$imageData = $_POST['imageData'];
		if (!$answerType){ // multiple choice
			$answerType = 'mc';
			if (!substr_count($answer, "|-*-|") == 3){ // answer A, B, C, D are splited by |-*-|
				return json_encode(array(
					'status' => 502,
					'errorMessage' => 'Error: Invalid form!'
				));
			}
		} else {
			$answerType = 'fr';
			if ($answer == ""){
				$answer = "|-*-|";
			} else {
				$answer .= " |-*-|";
			}
		}
		
		$sql = "INSERT INTO `ques_ans`(`base64_id`, `question`, `answer`, `answer_type`, `question_type`, `topic`, `difficulty`, `correct_answer`, `image_data`, approved) VALUES (?, ?, \"\", \"\", \"\", \"\", 0, \"\", \"\", 0)";
		$stmt = $conn->prepare($sql);
		$stmt->bind_param("ss", $base64_id, $question);
		$duplicate = true;
		while ($duplicate){
			$base64_id = randomString(11); //get a random base64_id
			$result = $stmt->execute();
			if (!$result) {
				if ($conn->errno == 1062 && str_contains($conn->error, "question")){ // if duplicate question
					$stmt->close();
					$conn->close();
					return json_encode(array(
						'status' => 502,
						'errorMessage' => "Error: Question already exists"
					));
				} else {
					$stmt->close();
					$conn->close();
					return json_encode(array(
						'status' => 502,
						'errorMessage' => "Error at query: ".$sql
					));
				}
			} else { // if no error with inserting the base64_id
				$duplicate = false;
			}
		}
		//----------------upload, rename image-----------------
		$imageData = explode(",", $imageData);
		$imagePath = array();

		foreach($imageData as $image){
			$filename = $image;
			$newFilename = "problem-".$base64_id."-".str_replace("Image", "", $image);
			list($status, $data) = uploadImage($filename, $newFilename);
			if ($status !== true){ // error upload file
				$conn->close();
				return json_encode(array(
					'status' => 502,
					'errorMessage' => $data
				));
			} else {
				array_push($imagePath, $data);
			}
		}
		$imagePath = implode(",", $imagePath);
		//------------------write to db-------------
		$sql = "UPDATE `ques_ans` SET `base64_id` = `id`, `question` = ?, `answer` = ?, `answer_type` = ?, `question_type` = ?, `topic` = ?, `difficulty` = ?, `correct_answer` = ?, `image_data` = ? WHERE `base64_id` = ?";
		$stmt = $conn->prepare($sql);
		$stmt->bind_param("sssssisss", $question, $answer, $answerType, $questionType, $topic, $difficulty, $correctAnswer, $imagePath, $base64_id);
		$result = $stmt->execute();
		if (!$result) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => "Error at query: ".$sql
			));
		}

		$stmt->close();
		$conn->close();
		return json_encode(array(
					'status' => 200
				));
	}
}
function uploadImage($filename, $newFilename){
	if($_FILES[$filename]['name'] != ''){
	    $upload_dir = '../assets/images/';
	    $tmp = explode('.', $_FILES[$filename]['name']);
	    $extension = end($tmp);    
	    $name = $newFilename.'.'.$extension;
	    $location = $upload_dir.$name;
		
		$moved = move_uploaded_file($_FILES[$filename]['tmp_name'], $location);
		if (!$moved){
			return array(False, "Error: ".$_FILES[$filename]['error']);
		}
		return array(True, $location);
	}
	return array(True, '');
}
echo main();
?>