# Frontend Startup Instructions

## Issue
The npm install is taking too long on your system. Here's how to fix it:

## Solution 1: Install in smaller batches

Open PowerShell in the frontend directory and run these commands one by one:

```powershell
# Navigate to frontend
cd "C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\frontend"

# Install core dependencies first
npm install react react-dom
npm install --save-dev vite @vitejs/plugin-react typescript

# Then install the rest
npm install axios react-router-dom
npm install @tanstack/react-query zustand
npm install framer-motion lucide-react
npm install react-hook-form zod @hookform/resolvers

# Install remaining packages
npm install
```

## Solution 2: Use npm with different settings

```powershell
# Clear npm cache
npm cache clean --force

# Install with legacy peer deps resolution
npm install --legacy-peer-deps

# Or install with force
npm install --force
```

## Solution 3: Run without full installation (Quick Test)

Since the backend is the main focus and it's working, you can test the backend API directly:

1. **Start Backend** (already working):
```powershell
cd backend
.\venv\Scripts\activate
python manage.py runserver
```

2. **Access via browser**:
- API: http://localhost:8000/api
- Admin: http://localhost:8000/admin
- Login with: fostanesmarkrenier@gmail.com / Admin@123

## Solution 4: Alternative - Use CDN Version (For Testing)

Create a simple HTML file to test the system:

```html
<!DOCTYPE html>
<html>
<head>
    <title>CCIS CodeHub Test</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <h1>CCIS CodeHub - Quick Test</h1>
    <button onclick="testAPI()">Test Backend API</button>
    <div id="result"></div>
    
    <script>
        async function testAPI() {
            try {
                const response = await axios.get('http://localhost:8000/api/');
                document.getElementById('result').innerHTML = 'API Working! Response: ' + JSON.stringify(response.data);
            } catch (error) {
                document.getElementById('result').innerHTML = 'Error: ' + error.message;
            }
        }
    </script>
</body>
</html>
```

Save this as `test.html` and open in browser.

## Backend is Ready!

The good news is that your backend is fully functional with:
- ✅ Django REST API
- ✅ Database configured
- ✅ Admin panel working
- ✅ Google Gemini AI support installed
- ✅ All backend features ready

You can start developing/testing using:
1. Django Admin Panel: http://localhost:8000/admin
2. API Endpoints: http://localhost:8000/api
3. API Documentation: http://localhost:8000/api/schema/swagger-ui/

## Next Steps

1. Try Solution 1 above to install frontend packages in batches
2. Or use the backend directly via Postman/curl for API testing
3. The backend has all the AI Mentor, learning paths, projects, and community features ready
