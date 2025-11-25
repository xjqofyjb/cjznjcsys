1) 双击 run.bat 首次启动会自动创建虚拟环境并安装依赖，然后运行在 http://127.0.0.1:8000
2) 打开 http://127.0.0.1:8000/docs 测试：
   - POST /uploads/init -> 返回 key & uploadId
   - GET  /uploads/part-url -> 返回预签名URL
   - PUT  该URL上传分片
   - POST /uploads/complete -> 合并分片
3) MinIO 控制台 http://localhost:9001 ，桶名 datasets
