<?php
    require('class.smtp.php');
    require('class.phpmailer.php');
    $nFrom = "TheSATGuys";    //company name
    $mFrom = 'thesatguys2021@gmail.com';  //email address 
    $mPass = 'TheS@TGuys';       //email password
    $nTo = urldecode($_GET['realname']); //Ten nguoi nhan
    $mTo = urldecode($_GET['email']);   //Dia chi nhan mail
    $body = urldecode($_GET['body']);   // Noi dung email
    $title = urldecode($_GET['title']);   //Tieu de email
	
	//echo $nTo,$mTo,$body,$title;
	
    $mail = new PHPMailer();
    $mail->IsSMTP();             
    $mail->CharSet  = "utf-8";
    $mail->SMTPDebug  = 0;   
    $mail->SMTPAuth   = true; 
    $mail->SMTPSecure = "ssl"; 
    $mail->Host       = "smtp.gmail.com";   
    $mail->Port       = 465;       
	
    $mail->Username   = $mFrom;
    $mail->Password   = $mPass;           
    $mail->SetFrom($mFrom, $nFrom);
    $mail->AddReplyTo('thesatguys2021@gmail.com', 'TheSATGuys');
    $mail->Subject = $title;
    $mail->MsgHTML($body);
    $mail->AddAddress($mTo, $nTo);
	
    if(!$mail->Send()){
        echo "fail";
    }else{
        echo "success";
    }
?>
