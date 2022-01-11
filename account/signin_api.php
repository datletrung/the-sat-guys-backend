<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

function main() {
	if ($_GET["request"] == "signin"){
		require(__DIR__."/../db_conn.php");
		$user = strtolower($_GET["user"]);
		$password = $_GET["password"];

		$sql = "SELECT * FROM user_auth WHERE user=? AND password=?";

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
				'errorMessage' => 'Error occurred while fetching data'
			));
		}

		if ($result == 0) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Wrong username/password or username does not exist!'
			));
		}

		if ($result == 1) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 200
			));
		}
	} else {
		return json_encode(array(
			'status' => 502,
			'errorMessage' => 'Invalid request.'
		));
	}
}

echo main();

?>
