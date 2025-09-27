# 🚀 SplintaxStore Backend Deployment Guide for Render

This guide will help you deploy your secure Discord webhook backend to Render.

## 📋 Prerequisites

- GitHub account
- Render account (free tier available)
- Your Discord webhook URL

## 🔧 Step 1: Prepare Your Backend Files

1. Create a new GitHub repository called `splintaxstore`
2. Upload these files to your repository:
   - `backend/server.js` (main backend server)
   - `backend/package.json` (dependencies)
   - `backend/test-webhook.js` (testing script)
   - `backend/env-example.txt` (environment variables template)

## 🌐 Step 2: Deploy to Render

### Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository `splintaxstore`
4. Configure the service:

**Basic Settings:**
- **Name:** `splintaxstore-backend`
- **Environment:** `Node`
- **Region:** `Oregon (US West)` or closest to you
- **Branch:** `main`
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Advanced Settings:**
- **Instance Type:** `Free` (or paid for better performance)
- **Auto-Deploy:** `Yes`

### Configure Environment Variables

In the Render dashboard, go to your service → Environment tab and add:

```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend-domain.com
```

**⚠️ IMPORTANT:** Replace `FRONTEND_URL` with your actual frontend domain for CORS configuration.

## 🔧 Step 3: Update Your Frontend

1. Open your `frontend/index.html` file
2. Find this line (around line 1786):
```javascript
this.backendUrl = 'https://your-backend-url.onrender.com';
```

3. Replace it with your actual Render URL:
```javascript
this.backendUrl = 'https://splintaxstore-backend-XXXX.onrender.com';
```

**Note:** Your actual Render URL will be shown in your Render dashboard after deployment.

## ✅ Step 4: Test Your Deployment

### Test Backend Health
Visit: `https://your-render-url.onrender.com/health`

You should see:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Webhook from Console
Open your website and run in browser console:
```javascript
webhookHandler.testWebhook()
```

### Test Checkout Flow
1. Add items to cart
2. Go to checkout
3. Fill in customer details
4. Check your Discord channel for notifications

## 🔒 Security Benefits

✅ **Discord webhook URL is now hidden** - stored securely on server  
✅ **Rate limiting** - prevents abuse (100 requests per 15 minutes)  
✅ **CORS protection** - only your frontend can access the API  
✅ **Input validation** - prevents malformed requests  
✅ **Error handling** - graceful failure handling  
✅ **Logging** - request monitoring and debugging  

## 📚 API Endpoints

Your backend provides these secure endpoints:

- `GET /health` - Health check
- `POST /api/webhook` - General webhook forwarding
- `POST /api/webhook/checkout` - Checkout notifications
- `POST /api/webhook/payment` - Payment notifications
- `POST /api/webhook/test` - Test webhook connection

## 🐛 Troubleshooting

### Common Issues

**1. "Backend API error: 500"**
- Check your Discord webhook URL is correct in Render environment variables
- Check Render logs for detailed error messages

**2. "CORS error"**
- Make sure `FRONTEND_URL` environment variable matches your frontend domain
- Include `https://` in the URL

**3. "Webhook not receiving messages"**
- Test webhook URL directly in Discord
- Check Discord channel permissions
- Verify webhook hasn't been deleted

### Render Logs
View logs in Render dashboard → Your Service → Logs tab

### Test Local Development
```bash
cd backend
npm install
cp env-example.txt .env
# Edit .env with your webhook URL
npm run dev
```

## 🔄 Updates and Maintenance

- **Auto-deploy:** Render automatically deploys when you push to GitHub
- **Environment updates:** Change environment variables in Render dashboard
- **Monitoring:** Use Render's built-in monitoring tools

## 🆘 Support

If you encounter issues:
1. Check Render logs first
2. Test webhook URL directly in browser/Postman
3. Verify environment variables are set correctly
4. Check Discord webhook permissions

---

**🎉 Congratulations!** Your Discord webhook is now securely hidden behind a backend API, making your SplintaxStore much more secure!
