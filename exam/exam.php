<?php
/*
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
*/

function fetchPart() {
	if ($_POST["request"] == "fetch_part"){
		require(__DIR__."/../db_conn.php");
		$base64_id = $_POST["id"];

		//---fetch question id---
		$sql = "SELECT `question_type` FROM `generator_log` WHERE `base64_id`=?";
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
			array_push($data, $row["question_type"]);
		}

		$stmt->close();
		$conn->close();
		return json_encode(array(
			'status'=>200,
			'data'=>$data
		));
	}
}

echo fetchPart();
?>