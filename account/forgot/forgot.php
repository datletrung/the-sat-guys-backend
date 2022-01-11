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
	if ($_POST["request"] == "forgotpwd"){
		require(__DIR__."/../../db_conn.php");

		$user = strtolower($_POST["user"]); //email
		$code = randomString(6);

		$sql = "UPDATE user_auth SET password='', code=? WHERE user=?";
		$stmt = $conn->prepare($sql);
		$stmt->bind_param("ss", $code, $user);
		$stmt->execute();
		$result = $stmt->get_result();

		if ($stmt->affected_rows == 0) {
			$stmt->close();
			$conn->close();
			return json_encode(array(
				'status' => 502,
				'errorMessage' => 'Email cannot be found!<br>Please try another email or create an account.'
			));
		} else {
			$user = urlencode($user);
			$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";

			$url = urlencode($protocol.$_SERVER['SERVER_NAME']."/account/password/?usreml=$user&vc=$code");

			$body = "<h2>Hello,</h2></br><p>We have received a request to reset your <b>TheSATGuys</b> account password.</p></br><p>Please click <a href='$url'>here</a> to reset your password or go to this link:<p></br>$url";

			$title = "Reset TheSATGuys Account Password";
			$url = $protocol.$_SERVER['SERVER_NAME']."/phpmailer/mail.php?realname=TheSATGuysUser&email=$user&body=$body&title=$title";

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
