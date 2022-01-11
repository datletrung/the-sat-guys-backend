<?php
/*
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
*/

function randomString($str_len){
	$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';
	$randstring = '';
	for ($i = 0; $i < $str_len; $i++) {
		$randstring .= $characters[rand(0, strlen($characters)-1)];
	}
	return $randstring;
}

function generateQuestion() {
	require(__DIR__."/../db_conn.php");
	if ($_POST["request"] == "fetch_topic"){
		$data = array();
		//---fetch topic cal---
		$data['cal'] = array();
		$sql = "SELECT DISTINCT `topic` FROM `ques_ans` WHERE `question_type` = \"cal\" AND `base64_id` = \"\" AND `difficulty` = 0 ORDER BY `topic`";
		$result = $conn->query($sql);
	
		if ($result->num_rows <= 0) {
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Error at query '.$sql
			));
		}
	
		while ($row = $result->fetch_assoc()){
			array_push($data['cal'], $row['topic']);
		}


		//---fetch topic no cal---
		$data['no_cal'] = array();
		$sql = "SELECT DISTINCT `topic` FROM `ques_ans` WHERE `question_type` = \"no_cal\" AND `base64_id` = \"\" AND `difficulty` = 0 ORDER BY `topic`";
		$result = $conn->query($sql);
	
		if ($result->num_rows <= 0) {
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Error at query '.$sql
			));
		}
	
		while ($row = $result->fetch_assoc()){
			array_push($data['no_cal'], $row['topic']);
		}
	
		$conn->close();
		return json_encode(array(
								'status'=>200,
								'data'=>$data
							));
	}elseif ($_POST["request"] == "generate_exam"){
		//--------BEGIN GENERATE RANDOM SEED----------
		$ip = getenv('HTTP_CLIENT_IP')?:
				  getenv('HTTP_X_FORWARDED_FOR')?:
				  getenv('HTTP_X_FORWARDED')?:
				  getenv('HTTP_FORWARDED_FOR')?:
				  getenv('HTTP_FORWARDED')?:
				  getenv('REMOTE_ADDR');
		$ip = str_replace(".", "", $ip);
		$ipTmp = str_split($ip, 5);
		$ip = 0;
		foreach($ipTmp as $tmp){
			$ip += intval($tmp);
		}
		$time = strval(microtime(true));
		$time = str_replace(".", "", $time);
		$timeTmp = str_split($time, 5);
		$time = 0;
		foreach($timeTmp as $tmp){
			$time += intval($tmp);
		}
		$randomSeed = strval($ip + $time);
		//--------END GENERATE RANDOM SEED----------

		$data = $_POST["data"];
		$user = strtolower($_SESSION["user"]==null ? "anonymous" : $_SESSION["user"]);

		//--------------BEGIN CHECK DATA INTEGRITY----------
		if (count($data) < 4 || count($data) > 7){ // not valid data
			return json_encode(array(
				'status' => 502,
				'errorMessage' => "Invalid request. (1010)"
			));
		}

		foreach ($data as $questionType => $part){
			if ($questionType == "numEasy"){
				$numEasy = intval($part);
			} elseif ($questionType == "numNormal"){
				$numNormal = intval($part);
			} elseif ($questionType == "numHard"){
				$numHard = intval($part);
			} elseif (!in_array($questionType, array("reading", "writing", "cal", "no_cal"))) {
				return json_encode(array(
					'status' => 502,
					'errorMessage' => "Invalid request. (1020)"
				));
			}
		}

		unset($data["numEasy"]);
		unset($data["numNormal"]);
		unset($data["numHard"]);
		$diffList = array($numEasy, $numNormal, $numHard);
		$totalQuestion = $numEasy + $numNormal + $numHard;
		//--------------END CHECK DATA INTEGRITY----------

		//---------Check if question exceeds limit--------------
		$maxQuestion = 0;
		$sql = "SELECT COUNT(`id`) AS `max_question` FROM `ques_ans` WHERE `approved`=1";
		$result = $conn->query($sql);

		if ($result->num_rows <= 0) {
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Error at query '.$sql
			));
		}
		
		$row = $result->fetch_assoc();
		$maxQuestion = $row['max_question'];

		if ($totalQuestion > $maxQuestion) {
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => "We don't have that many questions. Please enter a number <u>from 1 to ". min($maxQuestion, 100)."</u>."
			));
		}

		if ($totalQuestion > 100) {
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => "Limit of total number of questions is 100. Please enter a number <u>from 1 to 100</u>."
			));
		}

		//--------------reserve base64_id--------------
		$duplicate = true;

		while ($duplicate){
			$sql = "INSERT INTO generator_log (base64_id, random_seed, question_id, question_type, answer_type, user)
					SELECT ?, ?, '', '', '', ? FROM dual
					WHERE NOT EXISTS (SELECT * FROM generator_log WHERE base64_id=?)";
			$stmt = $conn->prepare($sql);
			$stmt->bind_param("ssss", $base64Id, $randomSeed, $user, $base64Id);
			$base64Id = randomString(11); //get a random base64_id
			$stmt->execute();

			//---------if no duplicate--------
			$sql = "SELECT base64_id, random_seed FROM generator_log WHERE base64_id=?";
			$stmt = $conn->prepare($sql);
			$stmt->bind_param("s", $base64Id);
			$stmt->execute();
			$result = $stmt->get_result();
			if ($result->num_rows <= 0) { //------if no base64Id was found (cannot insert or fetch)
				$stmt->close();
				$conn->close();
				return json_encode(array(
					'status' => 502,
					'errorMessage' => "Something went wrong. Please try again later."
				));
			} else { //----------if we find the base64Id we just inserted
				$row = $result->fetch_assoc();
				if ($base64Id == $row['base64_id'] && $randomSeed == $row['random_seed']){
					$duplicate = false;
				}
			}
		}
		$stmt->close();

		//--------------GENERATE------------------
		$totalFetched = 0;
		foreach ($data as $questionType => $part){ //------iterate part
			if (in_array($questionType, array("cal", "no_cal"))){
				$answerTypeList = array("mc", "fr");
			}

			//-------get mc/fr num
			$numQuestionOfPart = intval($part["_total"]); //-----get _total (1st element in the list)
			if (!$numQuestionOfPart){
				continue;
			}
			unset($part["_total"]);

			$topics = array_diff($part, [0]);
			unset($part); //----------free memory

			$numMc = floor($numQuestionOfPart * 45 / 58); //-------num of mc for this part
			$numFr = $numQuestionOfPart - $numMc;
			//---------LOOP THROUGH REQUEST-------------
			foreach ($answerTypeList as $answerType){ //------iterate mc, fr
				$paraList = array();
				switch ($answerType){
					case "mc":
						$loopLimit = $numMc;
						break;
					case "fr":
						$loopLimit = $numFr;
						break;
				}
				$c = 0;
				while ($c <= $loopLimit && $topics){
					foreach ($topics as $topic => $_){
						while (true){
							$difficulty = rand(1,3);
							if ($diffList[$difficulty-1]){
								$diffList[$difficulty-1]--;
								break;
							}
						}
						$topics[$topic]--;
						$topics = array_diff($topics, [0]);

						array_push($paraList, array($topic, $difficulty, $questionType, $answerType));

						$c++;
						if ($c > $loopLimit){
							break;
						}
					}
				}

				$paraListCage = array();
				foreach ($paraList as $paraVal){
					$paraVal = implode('|', $paraVal);
					if (array_key_exists($paraVal, $paraListCage)){
						$paraListCage[$paraVal]++;
					} else {
						$paraListCage[$paraVal] = 1;
					}
				}

				$types = '';
				$paraList = array();
				$queryList = array();
				foreach ($paraListCage as $paraKey => $paraVal){
					$tmp = explode("|", $paraKey);
					$topic = $tmp[0];
					$difficulty = $tmp[1];
					$questionType = $tmp[2];
					$answerType = $tmp[3];
					$limit = $paraVal;

					$currQuery = "(SELECT id FROM ques_ans WHERE topic = ? AND difficulty = ? AND question_type = ? AND answer_type = ? ORDER BY RAND() LIMIT ?)";

					array_push($queryList, $currQuery);
					$paraList = array_merge($paraList, array($topic, $difficulty, $questionType, $answerType, $limit));
					$types .= "sissi";
				}
				//-------QUERY-----
				if ($queryList){
					$questionList = array();
					if (count($queryList) > 1){
						$sql = "SELECT DISTINCT * FROM (";
						$sql .= implode(" UNION ALL ", $queryList);
						$sql .= ") AS T";
					} else {
						$sql = implode("", $queryList);
					}

					$sql = trim(trim($sql, "("), ")");

					$stmt = $conn->prepare($sql);
					$stmt->bind_param($types, ...$paraList);
					$stmt->execute();
					$result = $stmt->get_result();

					$numFetched = $result->num_rows;
					$totalFetched += $numFetched;

					if ($numFetched <= 0) {
						cleanDB($base64Id, $randomSeed);
						$stmt->close();
						$conn->close();
						return json_encode(array(
							'status' => 502,
							'errorMessage' => "Sorry! We don't have enough questions for one of your requests (section/topic/difficulty)"
						));
					}
					while ($row = $result->fetch_assoc()){
						array_push($questionList, $row['id']);
					}

					//-----write to db-----
					$sql = "INSERT INTO generator_log(base64_id, random_seed, question_id, question_type, answer_type, user) VALUES (?, ?, ?, ?, ?, ?)";
					$stmt = $conn->prepare($sql);
					$stmt->bind_param("ssssss", $base64Id, $randomSeed, $questionId, $questionType, $answerType, $user);
					$questionId = implode(",", $questionList);
					$result = $stmt->execute();
					if (!$result) {
						cleanDB($base64Id, $randomSeed);
						$stmt->close();
						$conn->close();
						return json_encode(array(
							'status' => 502,
							'errorMessage' => 'Error at query '.$sql
						));
					}
					$stmt->close();
				}
			}
		}
		
		//---------BEGIN FINAL CHECK----------
		if ($totalFetched != $totalQuestion) {
			cleanDB($base64Id, $randomSeed);
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => "Sorry! We don't have enough questions for one of your requests (section/topic/difficulty)"
			));
		}
		//---------END FINAL CHECK----------

		//-----clear db-----
		cleanDB($base64Id, $randomSeed, false);

		// $stmt->close(); // EDITTED
		$conn->close();
		return json_encode(array(
								'status'=>200,
								'id'=>$base64Id
							));
	}
	else return json_encode(array(
		'status' => 502,
		'errorMessage' => "Invalid request. (1030)"
	));
}

function cleanDB($base64Id, $randomSeed, $clearAll=true){
	require(__DIR__."/../db_conn.php");
	if ($clearAll){
		$sql = "DELETE FROM generator_log WHERE base64_id=? AND random_seed=?";
	} else {
		$sql = "DELETE FROM generator_log WHERE base64_id=? AND random_seed=? AND question_id='' AND question_type=''";
	}
	$stmt = $conn->prepare($sql);
	$stmt->bind_param("ss", $base64Id, $randomSeed);
	$result = $stmt->execute();
	if (!$result) {
		$stmt->close();
		$conn->close();
		return json_encode(array(
			'status' => 502,
			'errorMessage' => 'Error at query '.$sql
		));
	}
}

echo generateQuestion();

?>
