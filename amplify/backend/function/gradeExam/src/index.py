import os
import json
import boto3
import pymysql

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
    return [secret["db_host"], secret["db_usr"], secret["db_pwd"], secret["db_name"], secret["s3_addr"]]


def connect(db_host, db_usr, db_pwd, db_name):
    try:
        conn = pymysql.connect(host=db_host,user=db_usr,
                               passwd=db_pwd,db=db_name,
                               connect_timeout=5,
                               cursorclass=pymysql.cursors.DictCursor)
        return True, conn                       
    except Exception as e:
        return False, str(e)


#---------------------------BEGIN MAIN---------------------------
def main(event):
    db_host, db_usr, db_pwd, db_name, _ = get_secret()
    parser = json.loads(event["body"])
    #parser = event["body"]

    try:
        action = parser["action"]
        exam_id = parser["exam_id"]
        answer_list = parser["answer"]
    except Exception as e:
        return False, "Invalid request! (1010)"

    if action == "gradeExam" and exam_id:
        status, conn = connect(db_host, db_usr, db_pwd, db_name)
        if status:
            with conn.cursor() as cursor:
                graded_exam = {}

                query = "SELECT question_id\
                        FROM `exam`\
                        WHERE exam_id = %s\
                        "
                cursor.execute(query, [exam_id])
                response = cursor.fetchall()
                
                if response:
                    tmp = []
                    for i in response:
                        tmp.append(i['question_id'])
                    response = tmp
                    del tmp

                    if set(response) != set(answer_list.keys()):
                        return False, "The submitted exam does not match with the exam format in our database."

                    for question_id in response:
                        query = "SELECT statement\
                            FROM `answer`\
                            WHERE question_id = %s\
                                AND is_correct = 1\
                            "
                        cursor.execute(query, [question_id])
                        correct_answers = cursor.fetchall()
                        
                        graded_exam[question_id] = {
                                                    'is_correct':False,
                                                    'correct_answer':[]
                                                   }

                        for correct_answer in correct_answers:
                            correct_answer = correct_answer['statement']
                            graded_exam[question_id]['correct_answer'].append(correct_answer)
                            if correct_answer == answer_list[question_id]:
                                graded_exam[question_id]['is_correct'] = True
                                break

                    return True, graded_exam
                else:
                    return False, "Exam ID does not exist."
        else:
            return False, "Database connection error: " + str(conn)

    else:
        return False, "Invalid request! (1020)"

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