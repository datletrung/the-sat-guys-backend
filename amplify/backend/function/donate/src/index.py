import os
import json
import boto3
import base64
import random
import string
import pymysql

def generate_id():
    letters = string.ascii_letters + string.digits
    return ''.join(random.choice(letters) for i in range(12))

def get_secret():
    secret_name = os.environ["SECRET_NAME"]
    region_name = "us-east-2"

    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        response = client.get_secret_value(
            SecretId=secret_name
        )
    except Exception as e:
        raise e
    
    secret = json.loads(response['SecretString'])
    return [secret["db_host"], secret["db_usr"], secret["db_pwd"], secret["db_name"], secret["s3_name"]]

def get_bucket(s3_name):
    s3 = boto3.resource("s3")
    bucket = s3.Bucket(s3_name)
    return bucket

def connect(db_host, db_usr, db_pwd, db_name):
    try:
        conn = pymysql.connect(host=db_host,user=db_usr,
                               passwd=db_pwd,db=db_name,
                               connect_timeout=5,
                               cursorclass=pymysql.cursors.DictCursor)
        return True, conn                       
    except Exception as e:
        return False, str(e)

class UpdateDB:
    def update_topic(conn, subtopic, section, qtype, difficulty):
        query = "\
                SELECT `topic_id` FROM `topic` WHERE `subtopic`=%s AND `section`=%s\
                AND `type`=%s AND `difficulty`=%s\
                "
        with conn.cursor() as cursor:
            cursor.execute(query, [subtopic, section, qtype, difficulty])
            response = cursor.fetchall()
            if not response:
                return False, "Topic ID cannot be found!"

            topic_id = response[0]["topic_id"]

            query = "UPDATE `topic` SET `pending_count` = `pending_count` + 1 WHERE `topic_id`=%s"
            cursor.execute(query, [topic_id])
            conn.commit()
        return True, topic_id

    def update_question(conn, statement, is_image, topic_id, author_id):
        with conn.cursor() as cursor:
            while True:
                question_id = generate_id()
                query = "SELECT * FROM `question` WHERE `question_id`=%s"
                respone = cursor.execute(query, [question_id])
                if not respone:         #---------if ID not duplicate
                    break

            query = "INSERT INTO `question` (`question_id`, `statement`, `topic_id`, `image`, `author_id`)\
                    VALUES (%s, %s, %s, %s, %s)\
                    "
            cursor.execute(query, [question_id, statement, topic_id, is_image, author_id])
            conn.commit()
            return True, question_id

    def update_answer(conn, question_id, statement, image, is_condition, is_correct):
        with conn.cursor() as cursor:
            query = "INSERT INTO `answer` (`question_id`, `statement`, `image`, `is_condition`, `is_correct`)\
                    VALUES (%s, %s, %s, %s, %s)\
                    "
            cursor.execute(query, [question_id, statement, image, is_condition, is_correct])
            conn.commit()
            return True, ""
    
    def rollback(conn, bucket, topic_id, question_id = None):
        if topic_id:
            UpdateDB.restore_topic(conn, topic_id)
        if question_id:
            UpdateDB.restore_question(conn, question_id)
            UpdateDB.restore_answer(conn, question_id)
            if bucket:
                image_list = ["images/problem-"+question_id+"-statement.PNG",
                            "images/problem-"+question_id+"-answer1.PNG",
                            "images/problem-"+question_id+"-answer2.PNG",
                            "images/problem-"+question_id+"-answer3.PNG",
                            "images/problem-"+question_id+"-answer4.PNG",
                            ]
                for image in image_list:
                    try:
                        UpdateS3.delete_image(bucket, image)
                    except:
                        pass

    def restore_topic(conn, topic_id):
        with conn.cursor() as cursor:
            query = "UPDATE `topic` SET `pending_count` = `pending_count` - 1 WHERE `topic_id`=%s"
            cursor.execute(query, [topic_id])
            conn.commit()
            return True

    def restore_question(conn, question_id):
        with conn.cursor() as cursor:
            query = "DELETE FROM `question` WHERE `question_id`=%s"
            cursor.execute(query, [question_id])
            conn.commit()
            return True

    def restore_answer(conn, question_id):
        with conn.cursor() as cursor:
            query = "DELETE FROM `answer` WHERE `question_id`=%s"
            cursor.execute(query, [question_id])
            conn.commit()
            return True

class UpdateS3:
    def put_image(bucket, image_name, image):
        image = image[image.find(",")+1:]
        image = base64.b64decode(image.encode())
        bucket.put_object(Key=image_name, Body=image)

    def delete_image(bucket, image_name):
        bucket.delete_object(Key=image_name)


#---------------------------BEGIN MAIN---------------------------
def main(event):
    db_host, db_usr, db_pwd, db_name, s3_name = get_secret()
    parser = json.loads(event["body"])
    #parser = event["body"]
    try:
        action = parser["action"]
        questionConfig = parser["questionConfig"]
    except Exception as e:
        return False, "Invalid request! (1010)"

    if action == "donate":
        try:
            answers = questionConfig["answers"]
            question = questionConfig["question"]
            section = questionConfig["section"]
            topic = questionConfig["topic"]
            qtype = questionConfig["qtype"]
            difficulty = questionConfig["difficulty"]
            author_id = questionConfig["author_id"]
        except Exception as e:
            return False, "Invalid request! (1020)"
    
        status, conn = connect(db_host, db_usr, db_pwd, db_name)
        if status:
            bucket = get_bucket(s3_name)

            ## Update Topic Count
            status, data = UpdateDB.update_topic(conn, topic, section, qtype, difficulty)
            if not status:
                return False, "Error while updating database (1110): " + str(data)
            topic_id = data

            ## Push Question
            # Push Question to DB
            question_statement, question_image = question["question"], question["image"]
            is_image = True if question_image else False
            status, data = UpdateDB.update_question(conn, question_statement, is_image, topic_id, author_id)
            if not status:
                UpdateDB.rollback(conn, bucket, topic_id)
                return False, "Error while updating database (1120): " + str(data)
            question_id = data

            # Push Question Image to S3
            if question_image:
                try:
                    question_image_name = "images/problem-" + question_id + "-statement.PNG"
                    UpdateS3.put_image(bucket, question_image_name, question_image)
                except:
                    UpdateDB.rollback(conn, bucket, topic_id, question_id)
                    return False, "Error while uploading files!"


            ## Push Answers
            count = 0
            for answer in answers:
                count += 1
                try:
                    answer_statement, answer_image, is_correct, is_condition = \
                        answer['answer'], answer['image'], answer['isCorrect'], answer['isCondition']
                except Exception as e:
                    UpdateDB.rollback(conn, bucket, topic_id, question_id)
                    return False, "Invalid request! (1030)"
                
                is_image = ""
                if answer_image:
                    try:
                        answer_image_name = "images/problem-" + question_id + "-answer" + str(count) + ".PNG"
                        UpdateS3.put_image(bucket, answer_image_name, answer_image)
                        is_image = "answer"+str(count)
                    except:
                        UpdateDB.rollback(conn, bucket, topic_id, question_id)
                        return False, "Error while uploading files!"
                status = UpdateDB.update_answer(conn, question_id, answer_statement, is_image, is_condition, is_correct)
                if not status:
                    UpdateDB.rollback(conn, bucket, topic_id, question_id)
                    return False, "Database connection error!"
            return True, "Import question successfully!"
        else:
            return False, "Database connection error: " + str(conn)

    else:
        return False, "Invalid request! (1040)"

#---------------------------END MAIN---------------------------


def handler(event, context):
    status, data = main(event)
    return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps({
                                "status":status,
                                "data":data,
                    })
        }