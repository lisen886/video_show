# 宝塔 Linux 部署指南

本指南将帮助您在阿里云宝塔 Linux 面板上部署视频教学管理系统。

## 前置要求

1. 已安装宝塔面板
2. 已安装 Node.js（推荐 v16+ 或 v18+）
3. 已安装 PM2（宝塔面板软件商店可安装）
4. 已安装 Nginx（宝塔面板软件商店可安装）

## 部署步骤

### 1. 上传项目文件

#### 方法 A：使用 Git（推荐）

```bash
# SSH 登录服务器后执行
cd /www/wwwroot
git clone <your-repository-url> video-show
cd video-show
```

#### 方法 B：使用宝塔文件管理器

1. 在宝塔面板中打开「文件」管理器
2. 进入 `/www/wwwroot` 目录
3. 上传项目压缩包并解压
4. 重命名文件夹为 `video-show`

### 2. 安装后端依赖

```bash
cd /www/wwwroot/video-show/backend
npm install --production
```

或在宝塔终端中执行上述命令。

### 3. 配置环境变量

创建 `.env` 文件（可选，也可使用系统环境变量）：

```bash
cd /www/wwwroot/video-show/backend
nano .env
```

添加以下配置：

```env
# 服务器配置
PORT=4000
HOST=0.0.0.0
CLIENT_ORIGIN=http://8.138.149.208,https://your-domain.com

# 管理员账号（首次部署请修改）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password

# JWT 配置（请修改为随机字符串）
JWT_SECRET=your-random-secret-key-here
JWT_EXPIRES_IN=7d

# 存储配置
STORAGE_DRIVER=local
# 或使用阿里云 OSS
# STORAGE_DRIVER=oss
# OSS_REGION=oss-cn-hangzhou
# OSS_ACCESS_KEY_ID=your-key-id
# OSS_ACCESS_KEY_SECRET=your-key-secret
# OSS_BUCKET=your-bucket-name

# 年级配置（可选）
ALLOWED_GRADES=七年级,八年级,九年级
```

保存文件（`Ctrl+O`，然后 `Ctrl+X`）。

### 4. 使用 PM2 启动后端服务

#### 方法 A：使用 PM2 配置文件（推荐）

```bash
cd /www/wwwroot/video-show/backend

# 创建日志目录
mkdir -p logs

# 启动服务
pm2 start ecosystem.config.js

# 保存 PM2 配置（开机自启）
pm2 save
pm2 startup
```

#### 方法 B：直接启动

```bash
cd /www/wwwroot/video-show/backend
pm2 start src/server.js --name video-show-backend --env production
pm2 save
```

#### 检查服务状态

```bash
pm2 status
pm2 logs video-show-backend
```

### 5. 配置宝塔防火墙

1. 打开宝塔面板「安全」页面
2. 添加端口规则：
   - 端口：`4000`
   - 协议：`TCP`
   - 备注：`视频管理系统后端`
3. 点击「放行」

### 6. 配置阿里云安全组

1. 登录阿里云控制台
2. 进入「ECS」->「网络与安全」->「安全组」
3. 选择您的服务器安全组
4. 添加入站规则：
   - 端口范围：`4000/4000`
   - 协议类型：`TCP`
   - 授权对象：`0.0.0.0/0`（或指定IP）
   - 描述：`视频管理系统后端`

### 7. 配置 Nginx 反向代理（可选但推荐）

#### 方法 A：使用宝塔面板网站管理

1. 在宝塔面板「网站」中点击「添加站点」
2. 域名填写：`8.138.149.208` 或您的域名
3. 选择「纯静态」或「PHP项目」（不影响）
4. 点击「提交」

5. 点击站点右侧「设置」->「配置文件」
6. 在 `server` 块中添加以下配置：

```nginx
# API 反向代理
location /api {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # 文件上传大小限制
    client_max_body_size 500M;
    
    # 超时设置
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
}

# 健康检查
location /health {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
}
```

7. 保存并重载 Nginx

#### 方法 B：直接编辑配置文件

参考 `backend/nginx.conf.example` 文件，将配置添加到 Nginx 配置中。

### 8. 测试后端服务

在服务器本地测试：

```bash
curl http://localhost:4000/health
```

应该返回：
```json
{"status":"ok","uptime":123.456}
```

从外部测试：

```bash
# 在本地电脑执行
curl http://8.138.149.208:4000/health
```

### 9. 配置前端

编辑前端配置文件：

```bash
nano /www/wwwroot/video-show/docs/config.js
```

修改 API 地址：

```javascript
window.APP_CONFIG.API_BASE_URL = 'http://8.138.149.208:4000/api';
// 如果配置了域名和 HTTPS，使用：
// window.APP_CONFIG.API_BASE_URL = 'https://your-domain.com/api';
```

### 10. 部署前端（如果使用 Nginx）

如果使用 Nginx 反向代理，可以同时部署前端：

1. 在宝塔面板网站设置中，将「网站目录」设置为：
   ```
   /www/wwwroot/video-show/docs
   ```

2. 添加以下配置到 Nginx：

```nginx
location / {
    root /www/wwwroot/video-show/docs;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

## 常用命令

### PM2 管理

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs video-show-backend

# 重启服务
pm2 restart video-show-backend

# 停止服务
pm2 stop video-show-backend

# 删除服务
pm2 delete video-show-backend
```

### 查看服务

```bash
# 查看端口占用
netstat -tlnp | grep 4000

# 查看进程
ps aux | grep node
```

## 故障排除

### 1. 无法访问后端服务

- 检查 PM2 服务是否运行：`pm2 status`
- 检查端口是否监听：`netstat -tlnp | grep 4000`
- 检查防火墙是否开放 4000 端口
- 检查阿里云安全组规则

### 2. 连接超时

- 确认后端监听在 `0.0.0.0:4000` 而不是 `127.0.0.1:4000`
- 检查 `HOST` 环境变量是否设置为 `0.0.0.0`

### 3. CORS 错误

- 检查 `CLIENT_ORIGIN` 环境变量是否包含前端地址
- 或在 `backend/src/config.js` 中设置为 `'*'`（仅开发环境）

### 4. 文件上传失败

- 检查 `uploads` 目录权限：`chmod -R 755 uploads`
- 检查磁盘空间：`df -h`
- 检查 Nginx `client_max_body_size` 设置

## 安全建议

1. **修改默认密码**：首次部署后立即修改管理员密码
2. **使用强 JWT_SECRET**：使用随机字符串生成器生成
3. **配置 HTTPS**：使用宝塔面板 SSL 功能配置 HTTPS
4. **限制访问**：在安全组中限制只允许特定 IP 访问
5. **定期备份**：备份 `data/` 目录和 `uploads/` 目录

## 更新部署

```bash
cd /www/wwwroot/video-show
git pull  # 如果使用 Git
# 或重新上传文件

cd backend
npm install --production
pm2 restart video-show-backend
```

## 联系支持

如遇问题，请检查：
1. PM2 日志：`pm2 logs video-show-backend`
2. Nginx 日志：宝塔面板「网站」->「日志」
3. 系统日志：`journalctl -u nginx`

