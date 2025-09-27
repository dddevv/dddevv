const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
      'https://splintaxstore.netlify.app',
      'https://splintaxstore.netlify.app/'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Webhook endpoint for Discord notifications
app.post('/api/webhook', async (req, res) => {
  try {
    console.log('Webhook request received:', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      bodySize: JSON.stringify(req.body).length
    });

    // Validate that webhook URL is configured
    if (!process.env.DISCORD_WEBHOOK_URL) {
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
    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Splintax-Store-Bot/1.0'
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
app.post('/api/webhook/checkout', async (req, res) => {
  try {
    const { transactionId, customerName, customerEmail, customerDiscord } = req.body;
    
    if (!transactionId || !customerName || !customerEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: transactionId, customerName, customerEmail' 
      });
    }

    const embed = {
      title: "🛒 New Checkout Started",
      color: 0x00ff00,
      fields: [
        {
          name: "Transaction Details",
          value: `**ID:** ${transactionId}\n**Name:** ${customerName}\n**Email:** ${customerEmail}\n**Discord:** ${customerDiscord || 'Not provided'}`,
          inline: false
        }
      ],
      footer: { text: "SplintaxStore - Checkout System" },
      timestamp: new Date().toISOString()
    };

    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    res.json({ success: true, message: 'Checkout notification sent' });
  } catch (error) {
    console.error('Checkout webhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to send checkout notification' });
  }
});

app.post('/api/webhook/payment', async (req, res) => {
  try {
    const { transactionId, amount, cryptoAddress, customerInfo } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: transactionId' 
      });
    }

    const embed = {
      title: "💰 Payment Detected",
      color: 0xffd700,
      fields: [
        {
          name: "Payment Details",
          value: `**Transaction ID:** ${transactionId}\n**Amount:** ${amount || 'Unknown'}\n**Address:** ${cryptoAddress || 'Not provided'}`,
          inline: false
        }
      ],
      footer: { text: "SplintaxStore - Payment System" },
      timestamp: new Date().toISOString()
    };

    if (customerInfo) {
      embed.fields.push({
        name: "Customer Info",
        value: `**Name:** ${customerInfo.name || 'Unknown'}\n**Email:** ${customerInfo.email || 'Unknown'}`,
        inline: false
      });
    }

    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    res.json({ success: true, message: 'Payment notification sent' });
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
      footer: { text: "SplintaxStore - Backend Test" }
    };

    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
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
  console.log(`🚀 SplintaxStore Backend running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhook`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  
  if (process.env.DISCORD_WEBHOOK_URL) {
    console.log('✅ Discord webhook URL configured');
  } else {
    console.warn('⚠️  Discord webhook URL not configured - set DISCORD_WEBHOOK_URL environment variable');
  }
});
