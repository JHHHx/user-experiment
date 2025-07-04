from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import json
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

# 读取数据库配置
with open('db_config.json', 'r', encoding='utf-8') as f:
    db_config = json.load(f)

def get_db_connection():
    return pymysql.connect(**db_config)

def get_or_create_user_id():
    """从请求中获取用户ID，如果不存在则创建新的"""
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        user_id = str(uuid.uuid4())
    return user_id

@app.route('/submit', methods=['POST'])
def submit():
    try:
        data = request.json
        content = data.get('content')
        page = data.get('page')
        user_id = get_or_create_user_id()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 根据页面类型分别处理数据
        if page == 'consent.html':
            # 保存知情同意记录
            sql = "INSERT INTO consent_records (user_id) VALUES (%s)"
            cursor.execute(sql, (user_id,))
            
        elif page == 'content.html':
            # 保存用户基本信息
            content_data = json.loads(content)
            sql = """INSERT INTO user_basic_info 
                    (user_id, age, gender, major) 
                    VALUES (%s, %s, %s, %s)"""
            cursor.execute(sql, (
                user_id,
                content_data.get('age'),
                content_data.get('gender'),
                content_data.get('major')
            ))
            
        elif page == 'main-annotate.html':
            # 保存标注数据
            annotation_data = json.loads(content)
            sql = """INSERT INTO annotation_data 
                    (user_id, image_name, annotation_data) 
                    VALUES (%s, %s, %s)"""
            cursor.execute(sql, (
                user_id,
                annotation_data.get('image'),
                json.dumps(annotation_data.get('annotations'))
            ))
            
        elif page == 'tool-verify.html':
            # 保存工具验证答案
            verify_data = json.loads(content)
            sql = """INSERT INTO tool_verify_answers 
                    (user_id, image_name, answers) 
                    VALUES (%s, %s, %s)"""
            cursor.execute(sql, (
                user_id,
                verify_data.get('image'),
                json.dumps(verify_data.get('answers'))
            ))
            
        else:
            # 其他页面的提交内容保存到通用表
            sql = """INSERT INTO submissions 
                    (user_id, page_name, content) 
                    VALUES (%s, %s, %s)"""
            cursor.execute(sql, (user_id, page, content))
        
        # 更新用户会话信息
        sql = """INSERT INTO user_sessions (user_id, current_page, progress)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                current_page = VALUES(current_page),
                progress = VALUES(progress)"""
        progress_data = {
            'last_page': page,
            'timestamp': datetime.now().isoformat()
        }
        cursor.execute(sql, (
            user_id,
            page,
            json.dumps(progress_data)
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # 在响应中返回用户ID
        return jsonify({
            'status': 'success',
            'user_id': user_id
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)