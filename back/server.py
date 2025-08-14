from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import uuid
from datetime import datetime
import mysql.connector
from mysql.connector import pooling
import os

app = Flask(__name__)
CORS(app, origins=['*'])

# 调试模式
DEBUG_MODE = False

# 数据库连接池配置
db_pool = None

def init_db_pool():
    """初始化数据库连接池"""
    global db_pool
    try:
        # 尝试从环境变量获取数据库配置
        db_config = {
            'host': os.environ.get('DB_HOST', 'localhost'),
            'user': os.environ.get('DB_USER', 'root'),
            'password': os.environ.get('DB_PASSWORD', ''),
            'database': os.environ.get('DB_NAME', 'user_experiment'),
            'charset': 'utf8mb4',
            'autocommit': True
        }
        
        # 创建连接池
        db_pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name="mypool",
            pool_size=5,
            **db_config
        )
        print("数据库连接池初始化成功")
    except Exception as e:
        print(f"数据库连接池初始化失败: {e}")
        db_pool = None

def get_db_connection():
    """从连接池获取数据库连接"""
    if db_pool:
        return db_pool.get_connection()
    else:
        # 如果连接池不可用，使用传统连接方式
        try:
            db_config = {
                'host': os.environ.get('DB_HOST', 'localhost'),
                'user': os.environ.get('DB_USER', 'root'),
                'password': os.environ.get('DB_PASSWORD', ''),
                'database': os.environ.get('DB_NAME', 'user_experiment'),
                'charset': 'utf8mb4',
                'autocommit': True
            }
            return mysql.connector.connect(**db_config)
        except FileNotFoundError:
            # 如果环境变量不存在，使用默认配置
            db_config = {
                'host': 'localhost',
                'user': 'root',
                'password': '',
                'database': 'user_experiment',
                'charset': 'utf8mb4',
                'autocommit': True
            }
            return mysql.connector.connect(**db_config)

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
        
        # print(f"收到提交请求:")
        # print(f"  页面: {page}")
        # print(f"  用户ID: {user_id}")
        # print(f"  内容: {content}")
        
        # 如果是调试模式，只打印信息不实际提交到数据库
        if DEBUG_MODE:
            # print("调试模式：不保存到数据库")
            return jsonify({
                'status': 'success',
                'user_id': user_id,
                'debug_mode': True
            })
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 根据页面类型分别处理数据
        if page == 'user_init':
            # 处理用户初始化请求
            # print(f"处理用户初始化请求...")
            # 不需要保存到数据库，只返回用户ID
            pass
            
        elif page == 'index.html':
            # 保存知情同意记录
            # print(f"处理知情同意记录...")
            sql = "INSERT INTO consent_records (user_id) VALUES (%s)"
            cursor.execute(sql, (user_id,))
            # print(f"知情同意记录保存成功")
            
        elif page == 'content.html':
            content_data = json.loads(content)
            
            # 检查是否是基本信息（包含age字段）
            if 'age' in content_data:
                # 保存用户基本信息
                # print(f"处理用户基本信息...")
                sql = """INSERT INTO user_basic_info 
                        (user_id, age, gender, major) 
                        VALUES (%s, %s, %s, %s)"""
                cursor.execute(sql, (
                    user_id,
                    content_data.get('age'),
                    content_data.get('gender'),
                    content_data.get('major')
                ))
                # print(f"用户基本信息保存成功")
            else:
                # 保存阅读记录到通用表
                # print(f"处理阅读记录...")
                sql = """INSERT INTO submissions 
                        (user_id, page_name, content) 
                        VALUES (%s, %s, %s)"""
                cursor.execute(sql, (user_id, page, content))
                # print(f"阅读记录保存成功")
            
        elif page == 'main-annotate.html':
            # 保存标注数据
            # print(f"处理标注数据...")
            annotation_data = json.loads(content)
            sql = """INSERT INTO annotation_data 
                    (user_id, image_name, annotation_data) 
                    VALUES (%s, %s, %s)"""
            cursor.execute(sql, (
                user_id,
                annotation_data.get('image'),
                json.dumps(annotation_data.get('annotations'))
            ))
            # print(f"标注数据保存成功")
            
        elif page == 'tool-verify.html':
            # 保存工具验证答案
            # print(f"处理工具验证答案...")
            verify_data = json.loads(content)
            sql = """INSERT INTO tool_verify_answers 
                    (user_id, image_name, answers) 
                    VALUES (%s, %s, %s)"""
            cursor.execute(sql, (
                user_id,
                verify_data.get('image'),
                json.dumps(verify_data.get('answers'))
            ))
            # print(f"工具验证答案保存成功")
            
        elif page == 'end.html':
            # 更新问卷答案到现有记录
            # print(f"处理问卷答案...")
            survey_data = json.loads(content)
            
            # 先检查是否已有该用户的记录
            check_sql = "SELECT id, user_id FROM question_ans WHERE user_id = %s LIMIT 1"
            cursor.execute(check_sql, (user_id,))
            existing_record = cursor.fetchone()
            
            # print(f"检查现有记录 - 用户ID: {user_id}")
            # print(f"查询结果: {existing_record}")
            
            if existing_record:
                # 如果存在记录，则更新
                sql = """UPDATE question_ans 
                        SET answers1 = %s, answers2 = %s, answers3 = %s, answers4 = %s
                        WHERE user_id = %s"""
                cursor.execute(sql, (
                    survey_data.get('answers1'),
                    survey_data.get('answers2'),
                    survey_data.get('answers3'),
                    survey_data.get('answers4'),
                    user_id
                ))
                # print(f"问卷答案更新成功 - 记录ID: {existing_record[0]}")
            else:
                # 如果不存在记录，则插入新记录
                sql = """INSERT INTO question_ans 
                        (user_id, answers1, answers2, answers3, answers4) 
                        VALUES (%s, %s, %s, %s, %s)"""
                cursor.execute(sql, (
                    user_id,
                    survey_data.get('answers1'),
                    survey_data.get('answers2'),
                    survey_data.get('answers3'),
                    survey_data.get('answers4')
                ))
                # print(f"问卷答案插入成功 - 新记录")
            
        elif page == 'content-page2':
            # 更新了解程度评分到现有记录
            # print(f"处理了解程度评分...")
            rating_data = json.loads(content)
            
            # 先检查是否已有该用户的记录
            check_sql = "SELECT id, user_id FROM question_ans WHERE user_id = %s LIMIT 1"
            cursor.execute(check_sql, (user_id,))
            existing_record = cursor.fetchone()
            
            # print(f"检查现有记录 - 用户ID: {user_id}")
            # print(f"查询结果: {existing_record}")
            
            if existing_record:
                # 如果存在记录，则更新answers5字段
                sql = """UPDATE question_ans 
                        SET answers5 = %s
                        WHERE user_id = %s"""
                cursor.execute(sql, (
                    rating_data.get('answers5'),
                    user_id
                ))
                # print(f"了解程度评分更新成功 - 记录ID: {existing_record[0]}")
            else:
                # 如果不存在记录，则插入新记录
                sql = """INSERT INTO question_ans 
                        (user_id, answers5) 
                        VALUES (%s, %s)"""
                cursor.execute(sql, (
                    user_id,
                    rating_data.get('answers5')
                ))
                # print(f"了解程度评分插入成功 - 新记录")
            
        else:
            # 其他页面的提交内容保存到通用表
            # print(f"处理通用提交记录...")
            sql = """INSERT INTO submissions 
                    (user_id, page_name, content) 
                    VALUES (%s, %s, %s)"""
            cursor.execute(sql, (user_id, page, content))
            # print(f"通用提交记录保存成功")
        
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
        
        # print(f"提交处理完成，返回用户ID: {user_id}")
        
        # 在响应中返回用户ID
        return jsonify({
            'status': 'success',
            'user_id': user_id
        })
        
    except Exception as e:
        # print(f"Error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        })



if __name__ == '__main__':
    import os
    # 初始化数据库连接池
    init_db_pool()
    
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)