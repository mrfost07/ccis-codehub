# 🔧 Troubleshooting Connection Issues

## The frontend server shows "ready" but browser can't connect

### Quick Fix (Do this now):

#### Step 1: Stop the current server
In your PowerShell terminal where `npm run dev` is running:
- Press `Ctrl + C` to stop the server
- Confirm with `Y` if asked

#### Step 2: Clear everything
```bash
# Make sure you're in frontend directory
cd "C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\frontend"

# Clear Vite cache
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
```

#### Step 3: Restart the server
```bash
npm run dev
```

#### Step 4: Try accessing
Open your browser and try:
1. **http://localhost:3000** (main URL)
2. **http://127.0.0.1:3000** (alternative)
3. **http://localhost:3000/index.html** (with index.html)

### If Still Not Working:

#### Check 1: Is port 3000 actually free?
```bash
# Check what's using port 3000
netstat -ano | findstr :3000
```

If something is using it, either:
- Kill that process
- OR change Vite port to 3001 or 5173

#### Check 2: Try a different port
Edit `vite.config.ts`, change port:
```typescript
server: {
  port: 5173,  // Change from 3000 to 5173
  ...
}
```

Then restart: `npm run dev`
Access at: **http://localhost:5173**

#### Check 3: Look for errors in terminal
When you run `npm run dev`, look for:
- ❌ Red error messages
- ❌ "Failed to..." messages
- ❌ Module not found errors

If you see errors, copy them and we'll fix them.

#### Check 4: Check browser console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Take a screenshot if you see errors

### Most Common Issues:

#### Issue 1: OneDrive Sync
Your project is in OneDrive which can lock files.

**Fix:**
- Pause OneDrive temporarily
- OR move project to `C:\Projects\CCIS-CodeHub`

#### Issue 2: Windows Firewall
Windows might be blocking localhost.

**Fix:**
```bash
# Allow Node.js through firewall
# When the firewall popup appears, click "Allow"
```

#### Issue 3: Module Errors
lucide-react icons causing issues.

**Fix:**
```bash
cd frontend
npm uninstall lucide-react
npm install lucide-react@latest --force
npm run dev
```

#### Issue 4: React Errors
Something wrong with React code.

**Fix:** Use the simple test page:
1. Go to: **http://localhost:3000/src/test.html**
2. If you see "CCIS CodeHub Works!" - server is fine, React code has issue

### Emergency: Simple Static Test

If nothing works, let's test with pure HTML:

1. Create `frontend/public/test.html`:
```html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body style="background:#111; color:white; text-align:center; padding-top:100px;">
  <h1>Frontend Server Works!</h1>
  <p>If you see this, server is running correctly</p>
</body>
</html>
```

2. Access: **http://localhost:3000/test.html**

3. If you see "Frontend Server Works!" = Server is fine, React app has issues

### What to Check Next:

If simple HTML works but React doesn't:
- ✅ Server is working
- ❌ React code has errors
- 👉 Check browser console for React errors
- 👉 Check terminal for compile errors

### Get More Help:

Show me:
1. Full terminal output when running `npm run dev`
2. Browser console errors (F12 > Console tab)
3. What URL you're trying to access
4. Screenshot of the error

---

## Quick Test Command:

Run this to see if server responds:
```bash
curl http://localhost:3000
```

If you get HTML back = server works!
If you get "connection refused" = server not running properly

---

## Most Likely Solution:

Based on your screenshot showing "localhost refused to connect":

**The server started but immediately crashed or is blocked.**

Try this:
1. Stop server (Ctrl+C)
2. Run: `npm cache clean --force`
3. Run: `npm run dev`
4. Wait 5 seconds
5. Try: http://localhost:3000

If it says "ready in XXXms" in terminal but browser can't connect:
- **Windows Firewall is blocking it**
- Click "Allow" when Windows asks about Node.js
- OR temporarily disable Windows Defender Firewall for testing
