# Video Teaching Management System

A video upload, playback, and viewing statistics system based on Node.js + Express backend and GitHub Pages frontend.

## Features

### Admin Features
- ✅ Video upload (single file/batch upload)
- ✅ Video management (filter by grade, delete)
- ✅ Video playback (with seek support)
- ✅ Viewing statistics (filter by student/video, export CSV)
- ✅ Student management (add, approve, reject, delete students)
- ✅ Grade management (customize grade list)
- ✅ Collection management (create video collections, control student visibility)
- ✅ Playback settings (control whether students can seek)
- ✅ JWT authentication

### Student Features
- ✅ Student registration (requires teacher approval)
- ✅ Student login
- ✅ Video list browsing (grouped by grade/collection)
- ✅ Video playback (seek support controlled by teacher)
- ✅ Automatic viewing record saving

### Storage Support
- ✅ Local storage (default)
- ✅ Alibaba Cloud OSS storage (optional)

## Tech Stack

### Backend
- Node.js
- Express.js
- JWT authentication
- Bcrypt password hashing
- Multer file upload
- Ali-OSS (optional)

### Frontend
- Vanilla HTML/CSS/JavaScript
- GitHub Pages deployment support

## Quick Start

### Requirements
- Node.js >= 14.0.0
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd video_demo_zq
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Configure environment variables**

Create a `.env` file in the `backend` directory (optional, can use system environment variables):

```env
# Server configuration
PORT=3000
CLIENT_ORIGIN=http://localhost:8080

# Storage configuration
STORAGE_DRIVER=local
# Or use Alibaba Cloud OSS
# STORAGE_DRIVER=oss
# OSS_REGION=oss-cn-hangzhou
# OSS_ACCESS_KEY_ID=your-access-key-id
# OSS_ACCESS_KEY_SECRET=your-access-key-secret
# OSS_BUCKET=your-bucket-name

# Admin account
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# JWT configuration
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=7d

# Student page auto-refresh interval (seconds)
STUDENT_REFRESH_INTERVAL=5

# Default grades (optional, default: Grade 7, Grade 8, Grade 9)
ALLOWED_GRADES=七年级,八年级,九年级
```

4. **Start backend server**
```bash
npm start
# Or development mode (auto-restart)
npm run dev
```

5. **Configure frontend**

Edit `frontend/config.js` and set the backend API URL:

```javascript
window.APP_CONFIG = {
  API_BASE_URL: 'http://localhost:3000'
};
```

6. **Deploy frontend**

Deploy the `frontend` directory to GitHub Pages or any static file server.

## Project Structure

```
video_demo_zq/
├── backend/                 # Backend code
│   ├── src/
│   │   ├── config.js       # Configuration management
│   │   ├── server.js       # Server entry point
│   │   ├── middleware/     # Middleware
│   │   │   └── auth.js     # JWT authentication
│   │   ├── routes/         # Routes
│   │   │   ├── auth.js     # Authentication routes
│   │   │   ├── videos.js   # Video routes
│   │   │   ├── students.js # Student routes
│   │   │   ├── viewStats.js # Statistics routes
│   │   │   ├── collections.js # Collection routes
│   │   │   ├── grades.js   # Grade routes
│   │   │   └── settings.js # Settings routes
│   │   ├── services/       # Service layer
│   │   │   └── fileStorage.js # File storage service
│   │   └── storage/        # Data storage
│   │       ├── students.js
│   │       ├── collections.js
│   │       ├── grades.js
│   │       ├── settings.js
│   │       └── viewRecords.js
│   └── package.json
├── frontend/                # Frontend code
│   ├── index.html          # Admin page
│   ├── login.html          # Admin login
│   ├── student.html        # Student page
│   ├── student-login.html   # Student login
│   ├── student-register.html # Student registration
│   ├── app.js              # Admin page logic
│   ├── student.js          # Student page logic
│   ├── config.js           # Frontend configuration
│   └── styles.css          # Stylesheet
├── data/                   # Data files (JSON)
│   ├── videos.json
│   ├── students.json
│   ├── viewRecords.json
│   ├── collections.json
│   ├── grades.json
│   └── settings.json
└── uploads/                # Video upload directory (local storage)
```

## API Documentation

### Authentication

#### Admin Login
```
POST /api/auth/login
Body: { username, password }
Response: { token, user }
```

#### Verify Token
```
GET /api/auth/me
Headers: { Authorization: Bearer <token> }
```

### Videos

#### Upload Video
```
POST /api/videos
Headers: { Authorization: Bearer <token> }
Body: FormData { video, grade, collectionId? }
```

#### Get Video List (by grade)
```
GET /api/videos/by-grade/:grade?grade=<grade>&accessKey=<key>
```

#### Get Video Stream
```
GET /api/videos/:id/stream
Headers: { Range: bytes=0- }
```

#### Record View
```
POST /api/videos/:id/view
Body: { watchedTime?, totalDuration?, isNewView? }
```

### Students

#### Student Registration
```
POST /api/students/register
Body: { username, password, name?, grade? }
```

#### Student Login
```
POST /api/students/login
Body: { username, password }
```

#### Get Student List (admin)
```
GET /api/students
Headers: { Authorization: Bearer <token> }
```

#### Approve Student
```
POST /api/students/:id/approve
Headers: { Authorization: Bearer <token> }
```

### Statistics

#### Get Viewing Statistics
```
GET /api/view-stats
Headers: { Authorization: Bearer <token> }
Query: { studentId?, videoId? }
```

### Collections

#### Get Collection List
```
GET /api/collections
Headers: { Authorization: Bearer <token> }
```

#### Create Collection
```
POST /api/collections
Headers: { Authorization: Bearer <token> }
Body: { name, description? }
```

## Configuration

### Storage Driver

#### Local Storage (default)
```env
STORAGE_DRIVER=local
```
Video files are stored in the `uploads/` directory.

#### Alibaba Cloud OSS
```env
STORAGE_DRIVER=oss
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-key-id
OSS_ACCESS_KEY_SECRET=your-key-secret
OSS_BUCKET=your-bucket-name
```

### Grade Management

Default grades: Grade 7, Grade 8, Grade 9

Can be modified dynamically through the admin interface, or via environment variables:
```env
ALLOWED_GRADES=七年级,八年级,九年级,高一,高二
```

## Usage

### Admin Workflow

1. Access admin login page
2. Login with default credentials (admin/admin123, change on first use)
3. Upload videos (select grade, optional collection)
4. Manage students (approve registration requests)
5. View viewing statistics (export CSV available)
6. Manage collections (control student visibility)

### Student Workflow

1. Access student registration page
2. Fill in registration information
3. Wait for teacher approval
4. Login after approval
5. Browse and watch videos

## Important Notes

1. **Security**
   - Change default admin password on first deployment
   - Set JWT_SECRET to a random string
   - Use HTTPS in production

2. **Storage**
   - Local storage: Ensure `uploads/` directory has write permissions
   - OSS storage: Ensure OSS configuration is correct and has proper permissions

3. **CORS Configuration**
   - Ensure `CLIENT_ORIGIN` is configured correctly to allow frontend domain access

4. **Data Backup**
   - Regularly backup JSON files in the `data/` directory
   - If using local storage, backup the `uploads/` directory

## Development

### Development Mode
```bash
cd backend
npm run dev
```

### Adding New Features
- Backend routes: Add new route files in `backend/src/routes/`
- Frontend pages: Add new HTML/JS files in `frontend/`

## License

ISC

## Contributing

Issues and Pull Requests are welcome!

