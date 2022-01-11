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
    parser = json.loads(event["body"])
    #parser = event["body"]
    try:
        action = parser["action"]
    except Exception as e:
        return False, "Invalid request! (1010)"

    if action == "fetchTopic":
        status, conn = connect(db_host, db_usr, db_pwd, db_name)
        if status:
            with conn.cursor() as cursor:
                query = "SELECT DISTINCT `subtopic`, `section` FROM `topic`"
                cursor.execute(query)
                response = cursor.fetchall()
                data = []
                if not response:
                    return True, []
                return True, response
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