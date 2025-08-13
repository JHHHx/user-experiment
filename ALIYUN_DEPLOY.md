# 阿里云RDS MySQL 免费数据库配置指南

## 1. 注册阿里云账号
- 访问 https://www.aliyun.com
- 完成实名认证（必需）

## 2. 创建RDS实例
1. 进入RDS控制台：https://rds.console.aliyun.com
2. 点击"创建实例"
3. 选择"MySQL 8.0"
4. 选择"免费试用"
5. 配置参数：
   - **实例规格**：1核1GB
   - **存储空间**：20GB
   - **地域**：华东1（杭州）
   - **可用区**：随机分配
   - **网络类型**：专有网络VPC
   - **实例名称**：user-experiment-db

## 3. 配置数据库
1. **设置账号密码**：
   - 数据库账号：root
   - 密码：设置强密码（记住这个密码）

2. **创建数据库**：
   - 数据库名：user_experiment
   - 字符集：utf8mb4

3. **配置白名单**：
   - 添加白名单：0.0.0.0/0（允许所有IP访问）

## 4. 创建数据库表
在阿里云DMS控制台执行：

```sql
-- 创建用户表
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建问卷答案表
CREATE TABLE question_ans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    answers1 JSON,
    answers2 JSON,
    answers3 INT,
    answers4 JSON,
    answers5 INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 5. 获取连接信息
在RDS控制台查看：
- **内网地址**：rm-xxxxx.mysql.rds.aliyuncs.com
- **外网地址**：rm-xxxxx.mysql.rds.aliyuncs.com
- **端口**：3306
- **数据库名**：user_experiment
- **用户名**：root
- **密码**：您设置的密码

## 6. 配置Render环境变量
在Render的 "Environment Variables" 中添加：

```
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com
DB_USER=root
DB_PASSWORD=您的密码
DB_NAME=user_experiment
```

## 7. 测试连接
部署完成后，测试数据库连接是否正常。

## 注意事项
- 免费试用期6个月，到期后需要付费或迁移
- 建议设置强密码
- 生产环境建议限制IP白名单
- 定期备份数据库
