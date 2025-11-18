# 视频教学管理系统

一个基于 Node.js + Express 后端和 GitHub Pages 前端的视频上传、播放和观看统计系统。

## 功能特性

### 管理员功能
- ✅ 视频上传（支持单文件/批量上传）
- ✅ 视频管理（按年级筛选、删除）
- ✅ 视频播放（支持进度跳转）
- ✅ 观看统计（按学生/按视频筛选，导出CSV）
- ✅ 学生管理（添加、审批、拒绝、删除学生）
- ✅ 年级管理（自定义年级列表）
- ✅ 合集管理（创建视频合集，控制学生可见性）
- ✅ 播放设置（控制学生端是否允许进度跳转）
- ✅ JWT 身份认证

### 学生功能
- ✅ 学生注册（需教师审批）
- ✅ 学生登录
- ✅ 视频列表浏览（按年级、按合集分组）
- ✅ 视频播放（支持/禁止进度跳转，由教师控制）
- ✅ 观看记录自动保存

### 存储支持
- ✅ 本地存储（默认）
- ✅ 阿里云 OSS 存储（可选）

## 技术栈

### 后端
- Node.js
- Express.js
- JWT 认证
- Bcrypt 密码加密
- Multer 文件上传
- Ali-OSS（可选）

### 前端
- 原生 HTML/CSS/JavaScript
- 支持 GitHub Pages 部署

## 快速开始

### 环境要求
- Node.js >= 14.0.0
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd video_demo_zq
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **配置环境变量**

在 `backend` 目录下创建 `.env` 文件（可选，也可使用系统环境变量）：

```env
# 服务器配置
PORT=3000
CLIENT_ORIGIN=http://localhost:8080

# 存储配置
STORAGE_DRIVER=local
# 或使用阿里云 OSS
# STORAGE_DRIVER=oss
# OSS_REGION=oss-cn-hangzhou
# OSS_ACCESS_KEY_ID=your-access-key-id
# OSS_ACCESS_KEY_SECRET=your-access-key-secret
# OSS_BUCKET=your-bucket-name

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# JWT 配置
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=7d

# 学生页面自动刷新间隔（秒）
STUDENT_REFRESH_INTERVAL=5

# 默认年级（可选，默认：七年级,八年级,九年级）
ALLOWED_GRADES=七年级,八年级,九年级
```

4. **启动后端服务**
```bash
npm start
# 或开发模式（自动重启）
npm run dev
```

5. **配置前端**

编辑 `frontend/config.js`，设置后端 API 地址：

```javascript
window.APP_CONFIG = {
  API_BASE_URL: 'http://localhost:3000'
};
```

6. **部署前端**

将 `frontend` 目录部署到 GitHub Pages 或任何静态文件服务器。

## 项目结构

```
video_demo_zq/
├── backend/                 # 后端代码
│   ├── src/
│   │   ├── config.js       # 配置管理
│   │   ├── server.js       # 服务器入口
│   │   ├── middleware/     # 中间件
│   │   │   └── auth.js     # JWT 认证
│   │   ├── routes/         # 路由
│   │   │   ├── auth.js     # 认证路由
│   │   │   ├── videos.js   # 视频路由
│   │   │   ├── students.js # 学生路由
│   │   │   ├── viewStats.js # 统计路由
│   │   │   ├── collections.js # 合集路由
│   │   │   ├── grades.js   # 年级路由
│   │   │   └── settings.js # 设置路由
│   │   ├── services/       # 服务层
│   │   │   └── fileStorage.js # 文件存储服务
│   │   └── storage/        # 数据存储
│   │       ├── students.js
│   │       ├── collections.js
│   │       ├── grades.js
│   │       ├── settings.js
│   │       └── viewRecords.js
│   └── package.json
├── frontend/                # 前端代码
│   ├── index.html          # 管理员页面
│   ├── login.html          # 管理员登录
│   ├── student.html        # 学生页面
│   ├── student-login.html   # 学生登录
│   ├── student-register.html # 学生注册
│   ├── app.js              # 管理员页面逻辑
│   ├── student.js          # 学生页面逻辑
│   ├── config.js           # 前端配置
│   └── styles.css          # 样式文件
├── data/                   # 数据文件（JSON）
│   ├── videos.json
│   ├── students.json
│   ├── viewRecords.json
│   ├── collections.json
│   ├── grades.json
│   └── settings.json
└── uploads/                # 视频上传目录（本地存储）
```

## API 文档

### 认证相关

#### 管理员登录
```
POST /api/auth/login
Body: { username, password }
Response: { token, user }
```

#### 验证 Token
```
GET /api/auth/me
Headers: { Authorization: Bearer <token> }
```

### 视频相关

#### 上传视频
```
POST /api/videos
Headers: { Authorization: Bearer <token> }
Body: FormData { video, grade, collectionId? }
```

#### 获取视频列表（按年级）
```
GET /api/videos/by-grade/:grade?grade=<grade>&accessKey=<key>
```

#### 获取视频流
```
GET /api/videos/:id/stream
Headers: { Range: bytes=0- }
```

#### 记录观看
```
POST /api/videos/:id/view
Body: { watchedTime?, totalDuration?, isNewView? }
```

### 学生相关

#### 学生注册
```
POST /api/students/register
Body: { username, password, name?, grade? }
```

#### 学生登录
```
POST /api/students/login
Body: { username, password }
```

#### 获取学生列表（管理员）
```
GET /api/students
Headers: { Authorization: Bearer <token> }
```

#### 审批学生
```
POST /api/students/:id/approve
Headers: { Authorization: Bearer <token> }
```

### 统计相关

#### 获取观看统计
```
GET /api/view-stats
Headers: { Authorization: Bearer <token> }
Query: { studentId?, videoId? }
```

### 合集相关

#### 获取合集列表
```
GET /api/collections
Headers: { Authorization: Bearer <token> }
```

#### 创建合集
```
POST /api/collections
Headers: { Authorization: Bearer <token> }
Body: { name, description? }
```

## 配置说明

### 存储驱动

#### 本地存储（默认）
```env
STORAGE_DRIVER=local
```
视频文件存储在 `uploads/` 目录。

#### 阿里云 OSS
```env
STORAGE_DRIVER=oss
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-key-id
OSS_ACCESS_KEY_SECRET=your-key-secret
OSS_BUCKET=your-bucket-name
```

### 年级管理

默认年级：七年级、八年级、九年级

可通过管理员界面动态修改，或通过环境变量设置：
```env
ALLOWED_GRADES=七年级,八年级,九年级,高一,高二
```

## 使用说明

### 管理员操作流程

1. 访问管理员登录页面
2. 使用默认账号登录（admin/admin123，首次使用请修改）
3. 上传视频（选择年级、可选合集）
4. 管理学生（审批注册申请）
5. 查看观看统计（可导出CSV）
6. 管理合集（控制学生可见性）

### 学生操作流程

1. 访问学生注册页面
2. 填写注册信息
3. 等待教师审批
4. 审批通过后登录
5. 浏览并观看视频

## 注意事项

1. **安全性**
   - 首次部署请修改默认管理员密码
   - 修改 JWT_SECRET 为随机字符串
   - 生产环境使用 HTTPS

2. **存储**
   - 本地存储：确保 `uploads/` 目录有写入权限
   - OSS 存储：确保 OSS 配置正确，且有相应权限

3. **CORS 配置**
   - 确保 `CLIENT_ORIGIN` 配置正确，允许前端域名访问

4. **数据备份**
   - 定期备份 `data/` 目录下的 JSON 文件
   - 如使用本地存储，需备份 `uploads/` 目录

## 开发

### 开发模式
```bash
cd backend
npm run dev
```

### 添加新功能
- 后端路由：在 `backend/src/routes/` 添加新路由文件
- 前端页面：在 `frontend/` 添加新的 HTML/JS 文件

## 许可证

ISC

## 贡献

欢迎提交 Issue 和 Pull Request！

