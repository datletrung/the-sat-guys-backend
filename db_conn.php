<?php
$servername = "";
$username = "";
$password = "";
$dbname = "thesatguys";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

//echo "Success";
?> 