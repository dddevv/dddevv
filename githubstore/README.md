# 🛍️ GitHubStore - Premium Digital Marketplace

A modern, secure online marketplace that sells premium digital goods with Discord webhook integration for notifications and a robust backend API.

## ✨ Features

- **Premium Digital Goods**: High-quality digital products and services
- **Discord Integration**: Real-time notifications via Discord webhooks
- **Transaction Validation**: Secure transaction ID validation and one-time usage
- **IP Management**: Advanced IP blocking/whitelisting system
- **API Security**: Protected endpoints with API key authentication
- **Rate Limiting**: Built-in protection against abuse
- **Real-time Tracking**: Transaction monitoring with IP logging

## 🚀 Quick Start

### Prerequisites
- Node.js 14.0.0 or higher
- npm 6.0.0 or higher
- Discord webhook URL

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd githubstore
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env with your Discord webhook URL and API keys
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the store**
   - Frontend: `http://localhost:3000`
   - API: `http://localhost:3000/api`
   - Health check: `http://localhost:3000/health`

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Discord Webhook Configuration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# API Security
API_KEY=your-secret-api-key-2024
ADMIN_KEY=admin-secret-key-2024

# Server Configuration
PORT=3000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000

# Environment
NODE_ENV=production
```

### Discord Webhook Setup

1. Go to your Discord server settings
2. Navigate to Integrations → Webhooks
3. Create a new webhook
4. Copy the webhook URL
5. Add it to your `.env` file

## 📁 Project Structure

```
githubstore/
├── frontend/
│   └── index.html          # Store frontend interface
├── backend/
│   └── server.js           # Express.js backend server
├── admin/
│   └── ip-admin-tool.js    # IP management tool
├── package.json            # Dependencies and scripts
├── env.example             # Environment variables template
├── .env                    # Your environment variables (create this)
├── test-transaction-validation.js  # Testing script
├── RENDER_DEPLOYMENT.md    # Render deployment guide
├── README.md               # This file
└── .gitignore             # Git ignore rules
```

## 🔐 Security Features

### API Key Authentication
All webhook endpoints require a valid API key:
```bash
curl -X POST http://localhost:3000/api/webhook/checkout \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key-2024" \
  -d '{"transactionId":"TXN-123","customerName":"John","customerEmail":"john@example.com"}'
```

### Transaction ID Validation
- Format validation (alphanumeric, hyphens, underscores only)
- Length validation (8-100 characters)
- No spaces allowed
- One-time usage (prevents duplicate notifications)
- Uniqueness checking

### IP Management
Use the IP admin tool to manage access:
```bash
npm run admin status
npm run admin block 192.168.1.100
npm run admin allow 192.168.1.50
npm run admin mode whitelist
```

## 🌐 API Endpoints

### Webhook Endpoints
- `POST /api/webhook` - Generic webhook forwarding
- `POST /api/webhook/checkout` - Checkout notifications
- `POST /api/webhook/payment` - Payment notifications
- `POST /api/webhook/test` - Test webhook functionality

### Configuration
- `GET /api/config` - Backend configuration for frontend
- `GET /health` - Health check endpoint

### Admin Endpoints (Requires admin API key)
- `GET /api/admin/ip-status` - View IP management status
- `POST /api/admin/block-ip` - Block an IP address
- `POST /api/admin/allow-ip` - Allow an IP address
- `POST /api/admin/remove-ip` - Remove IP from lists
- `POST /api/admin/set-mode` - Set whitelist/blacklist mode

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```

### Testing Transaction Validation
```bash
npm test
```

### Testing Webhook Endpoints
```bash
node test-transaction-validation.js
```

## 📦 Deployment

### Quick Deploy to Render
1. **Follow the complete guide:** [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
2. **Or use these quick steps:**
   - Push your code to GitHub
   - Connect to Render.com
   - Set environment variables
   - Deploy! 🚀

### Environment Setup
1. Set all required environment variables
2. Ensure Discord webhook URL is configured
3. Set secure API keys
4. Configure CORS origins if needed

### Production Considerations
- Use a reverse proxy (nginx) for SSL termination
- Set up proper logging and monitoring
- Use a database instead of in-memory storage for production
- Implement proper backup strategies
- Set up health checks and alerts

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Use environment variables
2. **Use strong API keys** - Generate secure random keys
3. **Enable IP filtering** - Block suspicious IPs
4. **Monitor webhook usage** - Watch for unusual patterns
5. **Regular updates** - Keep dependencies updated
6. **Rate limiting** - Already implemented, but monitor usage

## 📞 Support

For issues and questions:
- Check the logs for error messages
- Verify environment configuration
- Test webhook connectivity
- Review IP management settings

## 📄 License

MIT License - see LICENSE file for details.

---

**GitHubStore** - Premium Digital Marketplace with Discord Integration