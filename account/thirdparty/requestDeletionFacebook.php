<?php
header('Content-Type: application/json');

$signed_request = $_POST['signed_request'];
$data = parse_signed_request($signed_request);
$user_id = $data['user_id'];

$caseNum = randomString(12);
// Start data deletion

$status_url = "https://www.thesatguys.xyz/account/thirdparty/delete.php?id=$caseNum"; // URL to track the deletion
$confirmation_code = $caseNum; // unique code for the deletion request

$data = array(
	'url' => $status_url,
	'confirmation_code' => $confirmation_code
);
echo json_encode($data);

function parse_signed_request($signed_request) {
	list($encoded_sig, $payload) = explode('.', $signed_request, 2);

	$secret = "3d394e87b744b027bb9bed9772f18e16"; // Use your app secret here

	// decode the data
	$sig = base64_url_decode($encoded_sig);
	$data = json_decode(base64_url_decode($payload), true);

	// confirm the signature
	$expected_sig = hash_hmac('sha256', $payload, $secret, $raw = true);
	if ($sig !== $expected_sig) {
		error_log('Bad Signed JSON signature!');
		return null;
	}

	return $data;
}

function base64_url_decode($input) {
	return base64_decode(strtr($input, '-_', '+/'));
}

function randomString($str_len){
	$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	$randstring = '';
	for ($i = 0; $i < $str_len; $i++) {
		$randstring .= $characters[rand(0, strlen($characters)-1)];
	}
	return $randstring;
}
?>