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
	if ($_POST["request"] == "signup"){
		require(__DIR__."/../../db_conn.php");

		$realName = $_POST["realName"];
		$user = strtolower($_POST["user"]); //email
		$code = randomString(6);

		$sql = "INSERT INTO user_auth (real_name, user, code) VALUES (?, ?, ?)";
		$stmt = $conn->prepare($sql);
		$stmt->bind_param("sss", $realName, $user, $code);
		$stmt->execute();
		$result = $stmt->get_result();

		if ($stmt->errno == 1062){
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Email already exists!<br>Please sign in or reset your password.'
			));
		} elseif ($result < 0) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Error at query '.$sql
			));
		} else {
			$user = urlencode($user);
			$realName = urlencode($realName);
			$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";

			$url = urlencode($protocol.$_SERVER['HTTP_HOST']."/account/password/?usreml=$user&vc=$code");

			$body = "<h2>Hello $realName,</h2></br><p>Thank you for creating an account with us.</p></br><p>Please click <a href='$url'>here</a> to verify your account or go to this link:<p></br>$url";

			$title = "Verify TheSATGuys Account";

			$url = $protocol.$_SERVER['HTTP_HOST']."/phpmailer/mail.php?realname=$realName&email=$user&body=$body&title=$title";

			$mail = file_get_contents($url);
			if ($mail == "fail") {
				$stmt->close();
				$conn->close();
				return json_encode(array(
					'status' => 502,
					'errorMessage' => 'Something went wrong!<br>Please try again later.'
				));
			}

			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 200
			));
		}
	} elseif ($_POST["request"] == "signupsm"){
		require(__DIR__."/../../db_conn.php");

		$realName = $_POST["realName"];
		$user = $_POST["user"]; //email
		$token = $_POST["token"];

		$sql = "INSERT INTO user_auth (third_party_token, real_name, user) VALUES (?, ?, ?)";
		$stmt = $conn->prepare($sql);
		$stmt->bind_param("sss", $token, $realName, $user);
		$stmt->execute();
		$result = $stmt->get_result();

		if ($stmt->errno == 1062){
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Email already exists!<br>Please sign in or reset your password.'
			));
		} elseif ($result < 0) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Error at query '.$sql
			));
		} else {
			$user = urlencode($user);
			$realName = urlencode($realName);
			$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";

			$body = "<h2>Hello $realName,</h2></br><p>Thank you for creating an account with us.</p></br><p>You can now sign in with either your google account or with your email that associates with your google account (password reset required).</p>";

			$title = "Welcome to TheSATGuys";

			$url = $protocol.$_SERVER['SERVER_NAME']."/phpmailer/mail.php?realname=$realName&email=$user&body=$body&title=$title";

			$mail = file_get_contents($url);
			if ($mail == "fail") {
				$stmt->close();
				$conn->close();
				return json_encode(array(
					'status' => 502,
					'errorMessage' => 'Something went wrong!<br>Please try again later.'
				));
			}

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
