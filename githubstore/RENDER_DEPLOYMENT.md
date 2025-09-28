# 🚀 Render Deployment Guide for GitHubStore

This guide will walk you through deploying your GitHubStore to Render.com, a modern cloud platform for hosting web applications.

## 📋 Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **Discord Webhook** - Already configured ✅
4. **API Keys** - Already configured ✅

## 🔧 Step-by-Step Deployment

### 1. **Prepare Your Repository**

Make sure your `githubstore` folder contains:
```
githubstore/
├── frontend/
│   └── index.html
├── backend/
│   └── server.js
├── admin/
│   └── ip-admin-tool.js
├── package.json
├── env.example
├── test-transaction-validation.js
└── README.md
```

### 2. **Create Render Web Service**

1. **Login to Render** → [render.com](https://render.com)
2. **Click "New +"** → **"Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**

   **Basic Settings:**
   - **Name:** `githubstore` (or whatever you prefer)
   - **Environment:** `Node`
   - **Region:** Choose closest to your users
   - **Branch:** `main` (or your default branch)
   - **Root Directory:** `githubstore` (important!)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### 3. **Environment Variables**

In Render dashboard, go to **Environment** tab and add:

```env
# Discord Webhook (Required)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1421968496186622144/GpKwiX1p5QShJyFqHg4sj_Y1F-mwd9zjd-AKk6CoMnuaBP4ossChi2xS1PwXkjzUZHV1

# API Security (Required)
API_KEY=splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336
ADMIN_KEY=splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336

# Server Configuration (Optional - defaults provided)
PORT=3000
NODE_ENV=production

# CORS Configuration (Update with your Render URL after deployment)
FRONTEND_URL=https://your-app-name.onrender.com
BACKEND_URL=https://your-app-name.onrender.com
```

### 4. **Deploy**

1. **Click "Create Web Service"**
2. **Wait for deployment** (usually 2-5 minutes)
3. **Get your URL** - Render will provide something like: `https://githubstore-xyz.onrender.com`

### 5. **Update CORS Settings**

After deployment, update your environment variables:

```env
FRONTEND_URL=https://your-actual-render-url.onrender.com
BACKEND_URL=https://your-actual-render-url.onrender.com
```

Then **redeploy** by clicking "Manual Deploy" → "Deploy latest commit"

## 🔒 Security Configuration

### Render Security Features

1. **HTTPS** - Automatically enabled
2. **Environment Variables** - Encrypted and secure
3. **Build Logs** - Private and secure
4. **Auto-deploy** - From your GitHub repository

### Additional Security Tips

1. **Use Strong API Keys** - Your keys are already secure ✅
2. **Enable IP Filtering** - Use the admin tool after deployment
3. **Monitor Logs** - Check Render logs regularly
4. **Regular Updates** - Keep dependencies updated

## 🛠️ Post-Deployment Testing

### 1. **Health Check**
```bash
curl https://your-app-name.onrender.com/health
```

### 2. **Test Webhook**
```bash
curl -X POST https://your-app-name.onrender.com/api/webhook/checkout \
  -H "Content-Type: application/json" \
  -H "x-api-key: splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336" \
  -d '{
    "transactionId": "TXN-TEST-' $(date +%s) '",
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "customerDiscord": "test#1234"
  }'
```

### 3. **Test Frontend**
Visit: `https://your-app-name.onrender.com`

## 📊 Monitoring & Management

### Render Dashboard Features

1. **Logs** - Real-time application logs
2. **Metrics** - CPU, memory, response times
3. **Deployments** - Deployment history
4. **Environment** - Variable management

### IP Management

After deployment, use the admin tool locally to manage IPs:

```bash
# Update the backend URL in your local .env
BACKEND_URL=https://your-app-name.onrender.com

# Then use the admin tool
npm run admin status
npm run admin block 192.168.1.100
npm run admin allow 192.168.1.50
```

## 🔄 Auto-Deployment

### GitHub Integration

1. **Automatic Deployments** - Every push to main branch
2. **Preview Deployments** - For pull requests
3. **Manual Deployments** - On-demand from Render dashboard

### Deployment Workflow

```bash
# Make changes locally
git add .
git commit -m "Update store features"
git push origin main

# Render automatically deploys! 🚀
```

## 💰 Render Pricing

### Free Tier (Perfect for GitHubStore)

- **750 hours/month** - More than enough for a store
- **Custom domains** - Add your own domain
- **HTTPS** - Included
- **Environment variables** - Included
- **Logs** - Included

### Paid Plans (If Needed)

- **Starter:** $7/month - Always-on service
- **Standard:** $25/month - More resources
- **Pro:** $85/month - High availability

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check `package.json` scripts
   - Verify Node.js version compatibility
   - Check build logs in Render dashboard

2. **Environment Variables**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify Discord webhook URL format

3. **CORS Errors**
   - Update `FRONTEND_URL` and `BACKEND_URL`
   - Check CORS configuration in server.js

4. **Webhook Failures**
   - Verify Discord webhook URL
   - Check API key authentication
   - Monitor Render logs for errors

### Getting Help

1. **Render Documentation** - [docs.render.com](https://docs.render.com)
2. **Render Support** - Available in dashboard
3. **Community** - Render Discord/Forums

## 🎉 Success!

Once deployed, your GitHubStore will be:

- ✅ **Live at:** `https://your-app-name.onrender.com`
- ✅ **Secure** with HTTPS and API keys
- ✅ **Monitored** with real-time logs
- ✅ **Auto-updated** from GitHub
- ✅ **Scalable** with Render's infrastructure

Your premium digital marketplace is now live! 🚀

---

**Need help?** Check the Render logs or contact Render support through their dashboard.
