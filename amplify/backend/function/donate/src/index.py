import os
import json
import boto3
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
    return [secret["db_host"], secret["db_usr"], secret["db_pwd"], secret["db_name"]]

db_host, db_usr, db_pwd, db_name = get_secret()

def connect():
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

            query = "UPDATE `topic` SET `count` = `count` + 1 WHERE `topic_id`=%s"
            cursor.execute(query, [topic_id])
            conn.commit()
        return True, topic_id

    def update_question(conn, statement, image, topic_id, author_id):
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
            cursor.execute(query, [question_id, statement, topic_id, image, author_id])
            conn.commit()
            return True, question_id
        return False, "Database connection error!"

    def update_answer(conn, question_id, statement, image, is_condition, is_correct):
        with conn.cursor() as cursor:
            query = "INSERT INTO `answer` (`question_id`, `statement`, `image`, `is_condition`, `is_correct`)\
                    VALUES (%s, %s, %s, %s, %s)\
                    "
            cursor.execute(query, [question_id, statement, image, is_condition, is_correct])
            conn.commit()
            return True, ""
        return False, "Database connection error!"
    
    def rollback(conn, topic_id, question_id = None):
        if topic_id:
            UpdateDB.restore_topic(conn, topic_id)
        if question_id:
            UpdateDB.restore_question(conn, question_id)
            UpdateDB.restore_answer(conn, question_id)

    def restore_topic(conn, topic_id):
        with conn.cursor() as cursor:
            query = "UPDATE `topic` SET `count` = `count` - 1 WHERE `topic_id`=%s"
            cursor.execute(query, [topic_id])
            conn.commit()
            return True, ""
        return False, "Database connection error!"

    def restore_question(conn, question_id):
        with conn.cursor() as cursor:
            query = "DELETE FROM `question` WHERE `question_id`=%s"
            cursor.execute(query, [question_id])
            conn.commit()
            return True, ""
        return False, "Database connection error!"

    def restore_answer(conn, question_id):
        with conn.cursor() as cursor:
            query = "DELETE FROM `answer` WHERE `question_id`=%s"
            cursor.execute(query, [question_id])
            conn.commit()
            return True, ""
        return False, "Database connection error!"
    

#---------------------------BEGIN MAIN---------------------------
def main(event):
    parser = json.loads(event["body"])
    #parser = event["body"]
    try:
        action = parser["action"]
        questionConfig = parser["questionConfig"]
    except Exception as e:
        #return False, "Invalid request (1010): " + str(e)
        return False, "Invalid request! (1010)"

    if action == "donate":
        try:
            '''
            answers = questionConfig["answers"]
            question = questionConfig["question"]
            section = questionConfig["section"]
            topic = questionConfig["topic"]
            qtype = questionConfig["qtype"]
            difficulty = questionConfig["difficulty"]
            author_id = questionConfig["author_id"]
            '''
            answers = questionConfig["answers"]
            question = questionConfig["question"]
            section = "cal"
            topic = "System of Equations"
            qtype = "mc"
            difficulty = "easy"
            author_id = "Oal0rMk0yZsB"
        except Exception as e:
            #return False, "Invalid request (1020): " + str(e)
            return False, "Invalid request! (1020)"
    
        status, conn = connect()
        if status:
            ## Update Topic Count
            status, data = UpdateDB.update_topic(conn, topic, section, qtype, difficulty)
            if not status:
                return False, "Error while updating database (1110): " + str(data)
            topic_id = data

            ## Push Question
            question_statement, question_image = question.values()
            question_image = question_image if question_image else ""
            status, data = UpdateDB.update_question(conn, question_statement, question_image, topic_id, author_id)
            if not status:
                UpdateDB.rollback(conn, topic_id)
                return False, "Error while updating database (1120): " + str(data)
            question_id = data

            ## Push Answers
            for answer in answers:
                try:
                    answer_statement, answer_image, is_correct, is_condition = \
                        answer['answer'], answer['image'], answer['isCorrect'], answer['isCondition']
                except Exception as e:
                    UpdateDB.rollback(conn, topic_id, question_id)
                    #return False, "Invalid request (1030): " + str(e)
                    return False, "Invalid request! (1030)"
                answer_image = answer_image if answer_image else ""
                status, data = UpdateDB.update_answer(conn, question_id, answer_statement, answer_image, is_condition, is_correct)
                if not status:
                    UpdateDB.rollback(conn, topic_id, question_id)
                    return False, data
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
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            'body': json.dumps({
                                "status":status,
                                "data":data,
                    })
        }