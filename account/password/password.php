<?php
/*
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
*/

function randomString($str_len){
	$characters = '0123456789';
	$randstring = '';
	for ($i = 0; $i < $str_len; $i++) {
		$randstring .= $characters[rand(0, strlen($characters)-1)];
	}
	return $randstring;
}

function main() {
	if ($_POST["request"] == "setpwd"){
		require(__DIR__."/../../db_conn.php");
		$user = strtolower($_POST["user"]);
		$password = $_POST["password"];
		$oldPassword = $_POST["oldPassword"]==null ? "" : $_POST["oldPassword"];
		$code = $_POST["code"]==null ? "" : $_POST["code"];

		$hashedPassword = hash('sha256', hash('sha512', hash('sha1', $password)));
		$hashedOldPassword = $oldPassword=="" ? "" : hash('sha256', hash('sha512', hash('sha1', $oldPassword)));

		$sql = "SELECT id FROM user_auth WHERE user=? AND password=?";
		$stmt = $conn->prepare($sql);
		$stmt->bind_param("ss", $user, $hashedOldPassword);
		$stmt->execute();
		$result = $stmt->get_result();

		if ($result->num_rows <= 0) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Wrong password!'
			));
		}

		$sql = "UPDATE user_auth SET password=?, code='' WHERE user=? AND code=?";
		$stmt = $conn->prepare($sql);
		$stmt->bind_param("sss", $hashedPassword, $user, $code);
		$stmt->execute();
		$result = $stmt->get_result();

		if ($stmt->affected_rows == 1) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 200
			));
		} else if ($stmt->affected_rows == 0) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Verification code is invalid or has been expired!'
			));
		}
	}
}

echo main();

?>
