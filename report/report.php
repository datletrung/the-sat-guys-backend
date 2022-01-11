<?php
/*
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
*/
session_start();
function randomString($str_len){
	$characters = '0123456789';
	$randstring = '';
	for ($i = 0; $i < $str_len; $i++) {
		$randstring .= $characters[rand(0, strlen($characters)-1)];
	}
	return $randstring;
}

function main() {
	if ($_POST["request"] == "report"){
		require(__DIR__."/../db_conn.php");
		$realName = $_POST["realName"];
		$user = strtolower($_SESSION["user"]==null ? "anonymous" : $_SESSION["user"]);
		$email = strtolower($_POST["email"]);
		$title = $_POST["title"];
		$message = $_POST["message"];
		$source = $_POST["source"];
		$note = $_POST["note"]==null ? "" : $_POST["note"];
		$note = json_encode($note);

		$sql = "INSERT INTO user_report (real_name, user, email, title, message, source, note) VALUES (?, ?, ?, ?, ?, ?, ?)";
		$stmt = $conn->prepare($sql);
		$stmt->bind_param("sssssss", $realName, $user, $email, $title, $message, $source, $note);
		$result = $stmt->execute();

		if ($result <= 0) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'An error has occurred! Please try again later.' 
			));
		} else {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 200
			));
		}
	}
}

echo main();

?>
