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
    db_host, db_usr, db_pwd, db_name, s3_addr = get_secret()
    s3_bucket = s3_addr + "problem-"

    parser = json.loads(event["body"])
    #parser = event["body"]

    try:
        action = parser["action"]
        exam_id = parser["exam_id"]
    except:
        return False, "Invalid request!"

    if action == "fetchExam":
        section = ""
        try:
            section = parser["section"]
        except:
            section = ""
            
        if section != "":
            query = "SELECT `question_id`, `section` FROM `exam` WHERE `exam_id`=%s AND `section`=%s"
        else:
            query = "SELECT `question_id`, `section` FROM `exam` WHERE `exam_id`=%s"
    else:
        return False, "Invalid request!"

    status, conn = connect(db_host, db_usr, db_pwd, db_name)
    if status:
        with conn.cursor() as cursor:
            if section:
                cursor.execute(query, [exam_id, section])
            else:
                cursor.execute(query, [exam_id])
            response = cursor.fetchall()
            if not response:
                return False, "Exam ID cannot be found!"

            final_response = {"exam_id": "",
                            "sections": {}
                            }
            for section in response:
                question_ids = section["question_id"].split(",")

                for question_id in question_ids:
                    question_id = str(question_id).strip()
                    query = """\
                    SELECT `question`.`statement` as `question_statement`,\
                                `question`.`image` as `question_image`,\
                                `answer`.`statement` as `answer_statement`,\
                                `answer`.`image` as `answer_image`,\
                                `answer`.`is_condition`,\
                                `topic`.`section`,
                                `topic`.`type`\
                            FROM `question`\
                            INNER JOIN `topic`\
                                ON `question`.`topic_id` = `topic`.`topic_id`\
                            INNER JOIN `answer`\
                                ON `question`.`question_id` = `answer`.`question_id`\
                            WHERE `question`.`question_id` = %s\
                    """

                    cursor.execute(query, [question_id])
                    response1 = cursor.fetchall()
                    if not response1:
                        return False, "Question " + str(question_id) + " cannot be found!"
                    
                    section = response1[0]["section"]
                    question_type = response1[0]["type"]
                    answer_statement = []
                    answer_image = []

                    if question_type == "mc":
                        for i in response1:
                            answer_statement.append(i["answer_statement"])
                            image = i["answer_image"]
                            image = s3_bucket + question_id + "-" + image + ".PNG " if image else ""
                            answer_image.append(image)

                    question_image = s3_bucket + question_id + "-statement.PNG " \
                        if response1[0]["question_image"] else ""

                    tmp = {
                        "question_id": question_id,
                        "question_type": question_type,
                        "question_statement": response1[0]["question_statement"],
                        "question_image": question_image,
                        "answer_statement": answer_statement,
                        "answer_image": answer_image,
                        "is_condition": bool(response1[0]["is_condition"])
                    }

                    if section in final_response["sections"]:
                        final_response["sections"][section].append(tmp)
                    else:
                        final_response["sections"][section] = [tmp]
            return True, final_response
    else:
        return False, "Database connection error: " + str(conn)
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