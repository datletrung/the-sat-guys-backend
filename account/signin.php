<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

function main() {
	if ($_POST["request"] == "signin"){
		require(__DIR__."/../db_conn.php");
		$user = strtolower($_POST["user"]);
		$password = $_POST["password"];
		$token = $_POST["token"];

		if (!$password && $token) {
			$password = $token;
			$sql = "SELECT * FROM user_auth WHERE user=? AND third_party_token=?";
		} elseif ($password && !$token) {
			$password = hash('sha256', hash('sha512', hash('sha1', $password)));
			$sql = "SELECT * FROM user_auth WHERE user=? AND password=?";
		} else {
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Invalid request.'
			));
		}

		$stmt = $conn->prepare($sql);
		$stmt->bind_param("ss", $user, $password);
		$stmt->execute();
		$result = $stmt->get_result();

		$result = $result->num_rows;

		if ($result < 0) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Error at query '.$sql
			));
		}

		if ($result == 0) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Wrong user/password or user does not exist!<br>If you have not verify your account, please check your email inbox.'
			));
		}

		if ($result == 1) {
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
