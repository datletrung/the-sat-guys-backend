import os
import json
import time
import boto3
import random
import string
import pymysql
import collections

def generate_id():
    letters = string.ascii_letters + string.digits
    return ''.join(random.choice(letters) for i in range(12))

def get_secret():
    #secret_name = os.environ["SECRET_NAME"]
    secret_name = "arn:aws:secretsmanager:us-east-2:926771674865:secret:thesatguys-secret-rZBfQd"
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
    #db_host, db_usr, db_pwd, db_name, s3_addr = get_secret()
    db_host, db_usr, db_pwd, db_name, _ = get_secret()
    #parser = json.loads(event["body"])
    parser = event["body"]
    #s3_bucket = s3_addr + "problem-"

    try:
        action = parser["action"]
        generate_config = parser["generateConfig"]
    except Exception as e:
        return False, "Invalid request! (1010)"

    if action == "generate":
        status, conn = connect(db_host, db_usr, db_pwd, db_name)
        if status:
            with conn.cursor() as cursor:
                final_response = {"exam_id": ""}

                user_id = generate_config["user_id"]
                sections = generate_config["sections"]
                
                query_final = ""
                query_list = []
                diff_list = generate_config["diffDict"]
                for section in sections:
                    section_name = section["section"]
                    style = section["style"]
                    total_question = section["totalQuestion"]
                    type_list = {"mc": random.randint(int(total_question*0.75), int(total_question*0.85)), "fr": 0}
                    type_list["fr"] = total_question - type_list["mc"]

                    #----------------------------------------
                
                    if style == 'specific': #--------select for 'specific' style
                        is_enough = False
                        for _ in range(100):
                            random.seed(int(1000 * time.time()) % 2**32)
                            diff_list_tmp = diff_list.copy()
                            type_list_tmp = type_list.copy()
                            topic_list = section["topicDist"].copy()

                            question_list = []
                            for _ in range(total_question):
                                tmp = {'section': section_name}
                                while topic_list:
                                    topic = list(topic_list.keys())[random.randint(0, len(topic_list) - 1)]
                                    if topic_list[topic] != 0:
                                        tmp["topic"] = topic
                                        topic_list[topic] -= 1
                                        if topic_list[topic] == 0:
                                            del topic_list[topic]
                                        break
                                    else:
                                        del topic_list[topic]
                        
                                while diff_list_tmp:
                                    diff = list(diff_list_tmp.keys())[random.randint(0, len(diff_list_tmp)-1)]
                                    if diff_list_tmp[diff] != 0:
                                        tmp["diff"] = diff
                                        diff_list_tmp[diff] -= 1
                                        if diff_list_tmp[diff] == 0:
                                            del diff_list_tmp[diff]
                                        break
                                    else:
                                        del diff_list_tmp[diff]
                        
                                while type_list_tmp:
                                    qtype = list(type_list_tmp.keys())[random.randint(0, len(type_list_tmp)-1)]
                                    if type_list_tmp[qtype] != 0:
                                        tmp["type"] = qtype
                                        type_list_tmp[qtype] -= 1
                                        if type_list_tmp[qtype] == 0:
                                            del type_list_tmp[qtype]
                                        break
                                    else:
                                        del type_list_tmp[qtype]
                        
                                question_list.append(tmp)

                            question_tuples = [tuple(d.items()) for d in question_list]
                            question_count = collections.Counter(question_tuples)
                            question_tuples = list(set(question_tuples))

                            if not question_tuples:
                                return False, "Invalid request! (1030)"
                            
                            ## CHECK ENOUGH QUESTION
                            query = ""
                            query_list_tmp = []
                            for question_tuple in question_tuples:
                                question = dict((key, value) for key, value in question_tuple)
                                count = question_count[question_tuple]
                                section_tmp = question["section"]
                                topic = question["topic"]
                                diff = question["diff"]
                                qtype = question["type"]

                                query += "(SELECT `topic_id`, %s AS `count` "\
                                        "FROM `topic` "\
                                        "WHERE `subtopic` = %s "\
                                            "AND `section` = %s "\
                                            "AND `type` = %s "\
                                            "AND `difficulty` = %s "\
                                            "AND `count` >= %s)"
                                query += " UNION ALL "
                            
                                query_list_tmp += [count, topic, section_tmp, qtype, diff, count]

                            
                            query = query.rstrip(" UNION ALL ")

                            cursor.execute(query, query_list_tmp)
                            responses = cursor.fetchall()

                            total_count = 0
                            for response in responses:
                                total_count += response['count']
                            

                            if len(question_tuples) < total_count:
                                continue
                            else:
                                is_enough = True
                                ## SELECT QUESTION ID
                                for response in responses:
                                    topic_id = response["topic_id"]
                                    count = response["count"]

                                    query_final += "(SELECT `question_id`"\
                                                    "FROM `question` "\
                                                    "WHERE `topic_id` = %s "\
                                                        "AND `approved` = 1 "\
                                                    "ORDER BY RAND() LIMIT %s)"
                                    query_final += " UNION ALL "
                                
                                    query_list += [topic_id, count]
                                break
                        
                        if not is_enough:
                            return False, "There are not enough questions for the requested topic/section."

                    else:#--------select for other style
                        #------fetch total topic count
                        for qtype in type_list:
                            type_count = type_list[qtype]
                            grand_total_count = 0
                            for diff in diff_list:
                                diff_count = diff_list[diff]
                                query = "SELECT `topic_id`,"\
                                                "count"\
                                            "FROM `topic` "\
                                            "WHERE `count` <> 0 "\
                                                "AND `section` = %s"\
                                                "AND `type` = %s"\
                                                "AND `difficulty` = %s"

                                cursor.execute(query, [section_name, qtype, diff])
                                responses = cursor.fetchall()

                                total_count = 0
                                for response in responses:
                                    total_count += response['count']
                                grand_total_count += total_count

                                if total_count < diff_count:
                                    return False, "There are not enough questions for the requested topic/section."
                                del total_count

                                for response in responses:
                                    diff_count -= response["count"]
                                    query_final += "(SELECT `question_id`"\
                                                    "FROM `question` "\
                                                    "WHERE `approved` = 1 "\
                                                        "AND `topic_id` = %s "\
                                                        "AND `approved` = 1 "\
                                                    "ORDER BY RAND() LIMIT %s)"
                                    query_final += " UNION ALL "
                                    
                                    if response["count"] > diff_count:
                                        query_list += [topic_id, response['count']]
                                        break
                                    else:
                                        query_list += [topic_id, diff_count]

                            if grand_total_count < type_count:
                                    return False, "There are not enough questions for the requested topic/section."
                            del grand_total_count
                    query_final = query_final.rstrip(" UNION ALL ")
                    
                    return True, str(query_final) + "|||||||||||||||||" + str(query_list)

                    cursor.execute(query_final, query_list)
                    response = cursor.fetchall()

                    tmp = True
                    while True:
                        exam_id = generate_id()
                        query = "SELECT * FROM `exam` WHERE `exam_id`=%s"
                        tmp = cursor.execute(query, [exam_id])
                        if not tmp:         #---------if ID not duplicate
                            break
                    del tmp
                    

                    final_response["exam_id"] = exam_id
                    for i in response:
                        question_id = i["question_id"]
                        
                        '''                 #--------------fetch questions and answer
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
                        '''
                        query = "INSERT INTO `exam` (`exam_id`, `section`, `question_id`, `user_id`)\
                                VALUES (%s, %s, %s, %s)\
                                "
                        cursor.execute(query, [exam_id, section, question_id, user_id])
                    conn.commit()

                    return True, final_response
                
                return False, "There are not enough questions for the requested topic/section."
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