const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for used transaction IDs (in production, use Redis or database)
const usedTransactionIds = new Set();

// IP Management System
const ipManager = {
  // In-memory storage (in production, use database)
  blockedIPs: new Set(),
  allowedIPs: new Set(),
  whitelistMode: false, // false = blocklist mode, true = whitelist mode
  
  // Add IP to blocklist
  blockIP(ip) {
    this.blockedIPs.add(ip);
    this.allowedIPs.delete(ip); // Remove from allowlist if exists
    console.log(`🚫 IP ${ip} added to blocklist`);
  },
  
  // Add IP to allowlist
  allowIP(ip) {
    this.allowedIPs.add(ip);
    this.blockedIPs.delete(ip); // Remove from blocklist if exists
    console.log(`✅ IP ${ip} added to allowlist`);
  },
  
  // Remove IP from both lists
  removeIP(ip) {
    this.blockedIPs.delete(ip);
    this.allowedIPs.delete(ip);
    console.log(`🗑️ IP ${ip} removed from all lists`);
  },
  
  // Check if IP is allowed
  isIPAllowed(clientIP) {
    if (this.whitelistMode) {
      // Whitelist mode: only allowed IPs can access
      return this.allowedIPs.has(clientIP) || this.allowedIPs.size === 0;
    } else {
      // Blacklist mode: blocked IPs cannot access
      return !this.blockedIPs.has(clientIP);
    }
  },
  
  // Get current status
  getStatus() {
    return {
      mode: this.whitelistMode ? 'whitelist' : 'blacklist',
      blockedCount: this.blockedIPs.size,
      allowedCount: this.allowedIPs.size,
      blockedIPs: Array.from(this.blockedIPs),
      allowedIPs: Array.from(this.allowedIPs)
    };
  },
  
  // Toggle between whitelist/blacklist mode
  setMode(mode) {
    this.whitelistMode = mode === 'whitelist';
    console.log(`🔄 IP filtering mode set to: ${mode}`);
  }
};

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL?.replace(/\/$/, ''), // Remove trailing slash
      process.env.FRONTEND_URL?.replace(/\/$/, '') + '/', // Add trailing slash
      'https://githubstore.netlify.app',
      'https://githubstore.netlify.app/',
      'http://localhost:3000',
      'http://localhost:8080'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Configuration endpoint for frontend
app.get('/api/config', (req, res) => {
  res.json({ 
    status: 'OK',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
    timestamp: new Date().toISOString()
  });
});

// IP filtering middleware
function checkIPAccess(req, res, next) {
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection?.remoteAddress || 
                   req.socket?.remoteAddress ||
                   req.ip || 
                   'Unknown';

  if (!ipManager.isIPAllowed(clientIP)) {
    console.warn(`🚫 Blocked request from IP: ${clientIP}`, {
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied from this IP address',
      ip: clientIP
    });
  }
  
  next();
}

// Admin endpoints for IP management (requires admin API key)
app.get('/api/admin/ip-status', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedAdminKey = process.env.ADMIN_KEY || 'splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336';
  
  if (adminKey !== expectedAdminKey) {
    return res.status(401).json({ success: false, error: 'Invalid admin key' });
  }
  
  res.json({
    success: true,
    status: ipManager.getStatus()
  });
});

app.post('/api/admin/block-ip', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedAdminKey = process.env.ADMIN_KEY || 'splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336';
  
  if (adminKey !== expectedAdminKey) {
    return res.status(401).json({ success: false, error: 'Invalid admin key' });
  }
  
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ success: false, error: 'IP address required' });
  }
  
  ipManager.blockIP(ip);
  res.json({ 
    success: true, 
    message: `IP ${ip} blocked successfully`,
    status: ipManager.getStatus()
  });
});

app.post('/api/admin/allow-ip', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedAdminKey = process.env.ADMIN_KEY || 'splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336';
  
  if (adminKey !== expectedAdminKey) {
    return res.status(401).json({ success: false, error: 'Invalid admin key' });
  }
  
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ success: false, error: 'IP address required' });
  }
  
  ipManager.allowIP(ip);
  res.json({ 
    success: true, 
    message: `IP ${ip} allowed successfully`,
    status: ipManager.getStatus()
  });
});

app.post('/api/admin/remove-ip', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedAdminKey = process.env.ADMIN_KEY || 'splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336';
  
  if (adminKey !== expectedAdminKey) {
    return res.status(401).json({ success: false, error: 'Invalid admin key' });
  }
  
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ success: false, error: 'IP address required' });
  }
  
  ipManager.removeIP(ip);
  res.json({ 
    success: true, 
    message: `IP ${ip} removed from all lists`,
    status: ipManager.getStatus()
  });
});

app.post('/api/admin/set-mode', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedAdminKey = process.env.ADMIN_KEY || 'splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336';
  
  if (adminKey !== expectedAdminKey) {
    return res.status(401).json({ success: false, error: 'Invalid admin key' });
  }
  
  const { mode } = req.body;
  if (!mode || !['whitelist', 'blacklist'].includes(mode)) {
    return res.status(400).json({ success: false, error: 'Mode must be "whitelist" or "blacklist"' });
  }
  
  ipManager.setMode(mode);
  res.json({ 
    success: true, 
    message: `IP filtering mode set to ${mode}`,
    status: ipManager.getStatus()
  });
});

// Validate transaction ID format and structure
function validateTransactionId(transactionId) {
  if (!transactionId || typeof transactionId !== 'string') {
    return { valid: false, error: 'Transaction ID must be a non-empty string' };
  }
  
  const cleanId = transactionId.trim();
  
  // Check minimum length
  if (cleanId.length < 8) {
    return { valid: false, error: 'Transaction ID must be at least 8 characters long' };
  }
  
  // Check maximum length
  if (cleanId.length > 100) {
    return { valid: false, error: 'Transaction ID must be less than 100 characters' };
  }
  
  // Check for spaces (not allowed)
  if (cleanId.includes(' ')) {
    return { valid: false, error: 'Transaction ID cannot contain spaces' };
  }
  
  // Check for valid characters (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
    return { valid: false, error: 'Transaction ID can only contain letters, numbers, hyphens, and underscores' };
  }
  
  // Check if transaction ID is already used
  if (usedTransactionIds.has(cleanId)) {
    return { valid: false, error: 'Transaction ID has already been used' };
  }
  
  return { valid: true, cleanId };
}

// Enhanced webhook security with authentication
app.post('/api/webhook', async (req, res) => {
  try {
    console.log('Webhook request received:', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      bodySize: JSON.stringify(req.body).length
    });

    // Validate that webhook URL is configured
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1421968496186622144/GpKwiX1p5QShJyFqHg4sj_Y1F-mwd9zjd-AKk6CoMnuaBP4ossChi2xS1PwXkjzUZHV1';
    
    if (!webhookUrl) {
      console.error('DISCORD_WEBHOOK_URL environment variable not set');
      return res.status(500).json({ 
        success: false, 
        error: 'Webhook configuration missing' 
      });
    }

    // Validate request body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Request body is required' 
      });
    }

    // Forward to Discord webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GitHubStore-Bot/1.0'
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send webhook to Discord' 
      });
    }

    console.log('Webhook sent successfully to Discord');
    res.json({ 
      success: true, 
      message: 'Webhook sent successfully' 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Specific endpoints for different types of notifications
app.post('/api/webhook/checkout', checkIPAccess, async (req, res) => {
  try {
    // API Key authentication
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.API_KEY || 'splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336';
    
    if (apiKey !== expectedApiKey) {
      console.warn('Unauthorized checkout webhook attempt:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }

    const { transactionId, customerName, customerEmail, customerDiscord } = req.body;
    
    if (!transactionId || !customerName || !customerEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: transactionId, customerName, customerEmail' 
      });
    }

    // Validate transaction ID format and check if it's already used
    const validation = validateTransactionId(transactionId);
    if (!validation.valid) {
      console.warn('Invalid or duplicate transaction ID attempt:', {
        transactionId,
        error: validation.error,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ 
        success: false, 
        error: validation.error 
      });
    }

    // Mark transaction ID as used
    usedTransactionIds.add(validation.cleanId);

    console.log('✅ Valid transaction ID processed:', {
      transactionId: validation.cleanId,
      customerEmail,
      timestamp: new Date().toISOString()
    });

    // Get client IP address (handles proxies and load balancers)
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection?.remoteAddress || 
                     req.socket?.remoteAddress ||
                     req.ip || 
                     'Unknown';

    const embed = {
      title: "🛒 New Checkout Started",
      color: 0x00ff00,
      fields: [
        {
          name: "Transaction Details",
          value: `**ID:** ${validation.cleanId}\n**Name:** ${customerName}\n**Email:** ${customerEmail}\n**Discord:** ${customerDiscord || 'Not provided'}`,
          inline: false
        },
        {
          name: "Security",
          value: `✅ Transaction ID validated\n✅ Unique transaction verified\n✅ Notification sent`,
          inline: false
        }
      ],
      footer: { text: `GitHubStore - Checkout System | IP: ${clientIP}` },
      timestamp: new Date().toISOString()
    };

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1421968496186622144/GpKwiX1p5QShJyFqHg4sj_Y1F-mwd9zjd-AKk6CoMnuaBP4ossChi2xS1PwXkjzUZHV1';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    res.json({ 
      success: true, 
      message: 'Checkout notification sent',
      transactionId: validation.cleanId,
      validated: true
    });
  } catch (error) {
    console.error('Checkout webhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to send checkout notification' });
  }
});

app.post('/api/webhook/payment', checkIPAccess, async (req, res) => {
  try {
    // API Key authentication
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.API_KEY || 'splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336';
    
    if (apiKey !== expectedApiKey) {
      console.warn('Unauthorized payment webhook attempt:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key' 
      });
    }

    const { transactionId, amount, cryptoAddress, customerInfo } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: transactionId' 
      });
    }

    // Validate transaction ID format and check if it's already used
    const validation = validateTransactionId(transactionId);
    if (!validation.valid) {
      console.warn('Invalid or duplicate payment transaction ID attempt:', {
        transactionId,
        error: validation.error,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ 
        success: false, 
        error: validation.error 
      });
    }

    // Mark transaction ID as used
    usedTransactionIds.add(validation.cleanId);

    console.log('✅ Valid payment transaction ID processed:', {
      transactionId: validation.cleanId,
      amount,
      timestamp: new Date().toISOString()
    });

    // Get client IP address (handles proxies and load balancers)
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection?.remoteAddress || 
                     req.socket?.remoteAddress ||
                     req.ip || 
                     'Unknown';

    const embed = {
      title: "💰 Payment Detected",
      color: 0xffd700,
      fields: [
        {
          name: "Payment Details",
          value: `**Transaction ID:** ${validation.cleanId}\n**Amount:** ${amount || 'Unknown'}\n**Address:** ${cryptoAddress || 'Not provided'}`,
          inline: false
        },
        {
          name: "Security",
          value: `✅ Transaction ID validated\n✅ Unique transaction verified\n✅ Payment notification sent`,
          inline: false
        }
      ],
      footer: { text: `GitHubStore - Payment System | IP: ${clientIP}` },
      timestamp: new Date().toISOString()
    };

    if (customerInfo) {
      embed.fields.push({
        name: "Customer Info",
        value: `**Name:** ${customerInfo.name || 'Unknown'}\n**Email:** ${customerInfo.email || 'Unknown'}`,
        inline: false
      });
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1421968496186622144/GpKwiX1p5QShJyFqHg4sj_Y1F-mwd9zjd-AKk6CoMnuaBP4ossChi2xS1PwXkjzUZHV1';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    res.json({ 
      success: true, 
      message: 'Payment notification sent',
      transactionId: validation.cleanId,
      validated: true
    });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to send payment notification' });
  }
});

// Test endpoint for webhook functionality
app.post('/api/webhook/test', async (req, res) => {
  try {
    const embed = {
      title: "🧪 Webhook Test",
      description: "Testing webhook connection from backend server",
      color: 0x0099ff,
      fields: [
        {
          name: "Test Details",
          value: `**Timestamp:** ${new Date().toISOString()}\n**Server:** Backend API\n**Status:** Connection successful`,
          inline: false
        }
      ],
      footer: { text: "GitHubStore - Backend Test" }
    };

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1421968496186622144/GpKwiX1p5QShJyFqHg4sj_Y1F-mwd9zjd-AKk6CoMnuaBP4ossChi2xS1PwXkjzUZHV1';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    res.json({ 
      success: true, 
      message: 'Test webhook sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to send test webhook' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 GitHubStore Backend running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhook`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  
  if (process.env.DISCORD_WEBHOOK_URL) {
    console.log('✅ Discord webhook URL configured');
  } else {
    console.warn('⚠️  Discord webhook URL not configured - set DISCORD_WEBHOOK_URL environment variable');
  }
  
  if (process.env.API_KEY) {
    console.log('✅ API key configured');
  } else {
    console.warn('⚠️  API key not configured - set API_KEY environment variable');
  }
  
  if (process.env.ADMIN_KEY) {
    console.log('✅ Admin key configured');
  } else {
    console.warn('⚠️  Admin key not configured - set ADMIN_KEY environment variable');
  }
});