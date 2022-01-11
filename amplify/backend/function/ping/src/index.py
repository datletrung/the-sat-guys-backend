import json

def handler(event, context):
    return {
        'statusCode': 200,
        'body': json.dumps({
                            "status": True,
                             "headers": {
                                "Access-Control-Allow-Headers": "Content-Type",
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                            },
                            "message": "pong",
                })
    }
