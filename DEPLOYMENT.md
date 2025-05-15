# 打分系统部署指南

## 环境要求
- Node.js 14.0.0 或更高版本
- npm 6.0.0 或更高版本

## 部署步骤

### 1. 准备前端代码
```bash
# 进入项目目录
cd client

# 安装依赖
npm install

# 构建生产版本
npm run build
```

### 2. 准备后端代码
```bash
# 回到根目录
cd ..

# 安装依赖
npm install
```

### 3. 配置环境变量（可选）
创建 `.env` 文件在项目根目录：
```
PORT=3000
HOST=0.0.0.0
```

### 4. 启动服务器
```bash
# 使用 PM2 启动（推荐）
npm install -g pm2
pm2 start server.js --name "grade-system"

# 或者直接启动
node server.js
```

### 5. 访问应用
- 本地访问：http://localhost:3000
- 远程访问：http://[服务器IP]:3000

## 注意事项
1. 确保服务器防火墙已开放 3000 端口
2. 如果使用云服务器，需要在安全组中开放 3000 端口
3. 建议在生产环境中使用 HTTPS
4. 建议配置域名并使用 Nginx 反向代理

## 使用 Nginx 反向代理（推荐）

### Nginx 配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 故障排查
1. 如果无法访问应用：
   - 检查服务器是否正在运行
   - 检查端口是否被占用
   - 检查防火墙设置
   - 检查安全组设置

2. 如果 WebSocket 连接失败：
   - 确保 Nginx 配置正确（如果使用）
   - 检查网络连接是否稳定
   - 检查浏览器控制台是否有错误信息

## 监控和维护
- 使用 PM2 监控应用状态：`pm2 monit`
- 查看日志：`pm2 logs grade-system`
- 重启应用：`pm2 restart grade-system` 