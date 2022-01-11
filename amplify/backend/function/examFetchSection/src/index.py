import os
import json
import boto3
import pymysql

def parse_URL(url):
    if "=" not in url:
        return []

    if "&" in url:
        url = url.split("&")
        result = {}
        for i in url:
            k, v = i.split("=")
            result[k] = v
    else:
        result = {}
        k, v = url.split("=")
        result[k] = v
    return result

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
    db_host, db_usr, db_pwd, db_name = get_secret()
    status = None
    data = None

    parser = parse_URL(event["body"])
    try:
        action = parser["action"]
        exam_id = parser["exam_id"]
    except:
        return False, "Invalid request!"

    if action == "fetchSection":
        query = "SELECT `section` FROM `exam` WHERE `exam_id`=%s"
        status, conn = connect(db_host, db_usr, db_pwd, db_name)
        if status:
            with conn.cursor() as cursor:
                cursor.execute(query, [exam_id])
                response = cursor.fetchall()
                if not response:
                    return False, "Exam ID cannot be found!"
                data = []
                for i in response:
                    data.append(i["section"])
                return True, data
        else:
            return False, "Database connection error: " + str(conn)
    else:
        return False, "Invalid request!"
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