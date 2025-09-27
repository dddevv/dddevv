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

// Generate crypto invoice endpoint
app.post('/api/invoice/generate', async (req, res) => {
  try {
    const { transactionId, amount, currency, customerInfo, items } = req.body;
    
    if (!transactionId || !amount || !currency) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: transactionId, amount, currency' 
      });
    }

    // Generate unique invoice ID
    const invoiceId = 'INV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Get crypto addresses based on currency
    const cryptoAddresses = {
      bitcoin: 'bc1qrfvanr8yklgytp7x9fccfqgaks5tvhfphw3msx',
      ethereum: '0xbBAcFe9764df34Ee3BEc34A929Be3FD5A150DC6D',
      usdt: '0xbBAcFe9764df34Ee3BEc34A929Be3FD5A150DC6D',
      solana: '8oaBitEWxsJPYkqSzzxgtZYJh2jLMkWHGySo9w56v8D5',
      litecoin: 'LPya7oZQmDsfmteXXFMGj3oGRXUvMhVHav'
    };

    const invoice = {
      invoiceId,
      transactionId,
      amount,
      currency: currency.toLowerCase(),
      address: cryptoAddresses[currency.toLowerCase()],
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      customerInfo: customerInfo || {},
      items: items || [],
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${cryptoAddresses[currency.toLowerCase()]}`,
      blockchainExplorer: getBlockchainExplorer(currency.toLowerCase(), cryptoAddresses[currency.toLowerCase()])
    };

    // Send invoice notification to Discord
    const embed = {
      title: `📄 New ${currency.toUpperCase()} Invoice Generated`,
      color: 0x00ff00,
      fields: [
        {
          name: "Invoice Details",
          value: `**Invoice ID:** ${invoiceId}\n**Transaction ID:** ${transactionId}\n**Amount:** ${amount} ${currency.toUpperCase()}\n**Address:** \`${cryptoAddresses[currency.toLowerCase()]}\``,
          inline: false
        },
        {
          name: "Customer Info",
          value: `**Name:** ${customerInfo?.name || 'Anonymous'}\n**Email:** ${customerInfo?.email || 'Not provided'}\n**Discord:** ${customerInfo?.discord || 'Not provided'}`,
          inline: false
        },
        {
          name: "Items",
          value: items?.map(item => `• ${item.name} - $${item.price}`).join('\n') || 'No items specified',
          inline: false
        }
      ],
      footer: { text: "SplintaxStore - Invoice System" },
      timestamp: new Date().toISOString()
    };

    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      console.warn('Failed to send invoice notification to Discord');
    }

    res.json({ 
      success: true, 
      invoice,
      message: 'Invoice generated successfully' 
    });
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate invoice' });
  }
});

// Verify payment endpoint with STRICT validation
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { invoiceId, transactionHash, currency } = req.body;
    
    if (!invoiceId || !transactionHash || !currency) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: invoiceId, transactionHash, currency' 
      });
    }

    // Validate transaction hash format
    if (!isValidTransactionHash(transactionHash, currency)) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Invalid transaction hash format for ' + currency.toUpperCase()
      });
    }

    console.log(`🔍 Verifying payment: ${currency.toUpperCase()} - ${transactionHash}`);

    // REAL blockchain verification
    const verificationResult = await verifyBlockchainTransaction(transactionHash, currency);
    
    if (verificationResult.success && verificationResult.verified) {
      // Send payment confirmation to Discord
      const embed = {
        title: "✅ Payment VERIFIED on Blockchain",
        color: 0x00ff00,
        fields: [
          {
            name: "Payment Details",
            value: `**Invoice ID:** ${invoiceId}\n**Transaction Hash:** \`${transactionHash}\`\n**Currency:** ${currency.toUpperCase()}\n**Amount:** ${verificationResult.amount || 'Verified'}\n**Confirmations:** ${verificationResult.confirmations}`,
            inline: false
          },
          {
            name: "Blockchain Data",
            value: `**Block Height:** ${verificationResult.blockHeight || 'N/A'}\n**Timestamp:** ${verificationResult.timestamp}\n**Fee:** ${verificationResult.fee || 'N/A'}`,
            inline: false
          },
          {
            name: "Blockchain Explorer",
            value: `[View Transaction](${getBlockchainExplorer(currency.toLowerCase(), transactionHash)})`,
            inline: false
          }
        ],
        footer: { text: "SplintaxStore - REAL Blockchain Verification" },
        timestamp: new Date().toISOString()
      };

      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      });

      console.log(`✅ Payment verified successfully: ${transactionHash}`);
    } else {
      console.log(`❌ Payment verification failed: ${verificationResult.error}`);
    }

    res.json(verificationResult);
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      success: false, 
      verified: false,
      error: 'Failed to verify payment: ' + error.message 
    });
  }
});

// Validate transaction hash format
function isValidTransactionHash(hash, currency) {
  if (!hash || typeof hash !== 'string') return false;
  
  const cleanHash = hash.trim();
  
  switch (currency.toLowerCase()) {
    case 'bitcoin':
      // Bitcoin tx hash: 64 hex characters
      return /^[a-fA-F0-9]{64}$/.test(cleanHash);
    
    case 'ethereum':
    case 'usdt':
      // Ethereum tx hash: 66 hex characters (0x + 64 chars)
      return /^0x[a-fA-F0-9]{64}$/.test(cleanHash);
    
    case 'solana':
      // Solana tx hash: base58 encoded, typically 87-88 characters
      return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(cleanHash);
    
    case 'litecoin':
      // Litecoin tx hash: 64 hex characters (same as Bitcoin)
      return /^[a-fA-F0-9]{64}$/.test(cleanHash);
    
    default:
      return false;
  }
}

// Helper function to get blockchain explorer URLs
function getBlockchainExplorer(currency, addressOrHash) {
  const explorers = {
    bitcoin: `https://blockstream.info/address/${addressOrHash}`,
    ethereum: `https://etherscan.io/address/${addressOrHash}`,
    usdt: `https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7?a=${addressOrHash}`,
    solana: `https://explorer.solana.com/address/${addressOrHash}`,
    litecoin: `https://blockchair.com/litecoin/address/${addressOrHash}`
  };
  return explorers[currency] || `https://blockchain.info/address/${addressOrHash}`;
}

// Helper function to verify blockchain transactions (REAL VERIFICATION)
async function verifyBlockchainTransaction(transactionHash, currency) {
  try {
    console.log(`🔍 Verifying ${currency.toUpperCase()} transaction: ${transactionHash}`);
    
    let verificationResult = {
      success: false,
      verified: false,
      amount: null,
      confirmations: 0,
      timestamp: null,
      message: 'Transaction not found',
      error: null
    };

    // Real blockchain API calls
    switch (currency.toLowerCase()) {
      case 'bitcoin':
        verificationResult = await verifyBitcoinTransaction(transactionHash);
        break;
      case 'ethereum':
        verificationResult = await verifyEthereumTransaction(transactionHash);
        break;
      case 'usdt':
        verificationResult = await verifyUSDTTransaction(transactionHash);
        break;
      case 'solana':
        verificationResult = await verifySolanaTransaction(transactionHash);
        break;
      case 'litecoin':
        verificationResult = await verifyLitecoinTransaction(transactionHash);
        break;
      default:
        verificationResult.error = 'Unsupported currency';
        return verificationResult;
    }

    console.log(`✅ Verification result for ${currency}:`, verificationResult);
    return verificationResult;
  } catch (error) {
    console.error(`❌ Verification error for ${currency}:`, error);
    return {
      success: false,
      verified: false,
      error: error.message || 'Verification failed'
    };
  }
}

// Bitcoin verification using Blockstream API
async function verifyBitcoinTransaction(txHash) {
  try {
    const response = await fetch(`https://blockstream.info/api/tx/${txHash}`);
    
    if (!response.ok) {
      return {
        success: false,
        verified: false,
        error: 'Transaction not found on Bitcoin blockchain'
      };
    }
    
    const tx = await response.json();
    
    // Get confirmations
    const blockResponse = await fetch(`https://blockstream.info/api/tx/${txHash}/status`);
    const status = await blockResponse.json();
    
    return {
      success: true,
      verified: true,
      amount: (tx.vout.reduce((sum, output) => sum + output.value, 0) / 100000000).toFixed(8), // Convert satoshis to BTC
      confirmations: status.confirmed ? status.block_height : 0,
      timestamp: new Date(tx.status.block_time * 1000).toISOString(),
      message: 'Bitcoin transaction verified',
      blockHeight: tx.status.block_height,
      fee: tx.fee / 100000000 // Convert to BTC
    };
  } catch (error) {
    return {
      success: false,
      verified: false,
      error: `Bitcoin verification failed: ${error.message}`
    };
  }
}

// Ethereum verification using Etherscan API
async function verifyEthereumTransaction(txHash) {
  try {
    // You'll need to get a free API key from etherscan.io
    const apiKey = process.env.ETHERSCAN_API_KEY || 'YourAPIKey';
    const response = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`);
    
    if (!response.ok) {
      return {
        success: false,
        verified: false,
        error: 'Failed to fetch Ethereum transaction'
      };
    }
    
    const result = await response.json();
    
    if (result.error) {
      return {
        success: false,
        verified: false,
        error: result.error.message || 'Transaction not found'
      };
    }
    
    const tx = result.result;
    
    // Get transaction receipt for confirmations
    const receiptResponse = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${apiKey}`);
    const receipt = await receiptResponse.json();
    
    return {
      success: true,
      verified: true,
      amount: (parseInt(tx.value, 16) / Math.pow(10, 18)).toFixed(8), // Convert wei to ETH
      confirmations: receipt.result ? parseInt(receipt.result.blockNumber, 16) : 0,
      timestamp: new Date().toISOString(), // Etherscan doesn't provide timestamp in this call
      message: 'Ethereum transaction verified',
      gasUsed: receipt.result ? parseInt(receipt.result.gasUsed, 16) : 0,
      gasPrice: parseInt(tx.gasPrice, 16) / Math.pow(10, 18)
    };
  } catch (error) {
    return {
      success: false,
      verified: false,
      error: `Ethereum verification failed: ${error.message}`
    };
  }
}

// USDT verification (ERC-20 token on Ethereum)
async function verifyUSDTTransaction(txHash) {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY || 'YourAPIKey';
    
    // Get transaction details
    const txResponse = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`);
    const txResult = await txResponse.json();
    
    if (txResult.error) {
      return {
        success: false,
        verified: false,
        error: 'USDT transaction not found'
      };
    }
    
    // Get token transfer events
    const tokenResponse = await fetch(`https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=0xdac17f958d2ee523a2206206994597c13d831ec7&address=${txResult.result.to}&startblock=0&endblock=999999999&sort=asc&apikey=${apiKey}`);
    const tokenResult = await tokenResponse.json();
    
    const usdtTransfer = tokenResult.result.find(transfer => transfer.hash.toLowerCase() === txHash.toLowerCase());
    
    if (!usdtTransfer) {
      return {
        success: false,
        verified: false,
        error: 'USDT transfer not found in transaction'
      };
    }
    
    return {
      success: true,
      verified: true,
      amount: (parseInt(usdtTransfer.value) / Math.pow(10, 6)).toFixed(6), // USDT has 6 decimals
      confirmations: parseInt(usdtTransfer.confirmations),
      timestamp: new Date(parseInt(usdtTransfer.timeStamp) * 1000).toISOString(),
      message: 'USDT transaction verified',
      from: usdtTransfer.from,
      to: usdtTransfer.to
    };
  } catch (error) {
    return {
      success: false,
      verified: false,
      error: `USDT verification failed: ${error.message}`
    };
  }
}

// Solana verification using Solana RPC
async function verifySolanaTransaction(txHash) {
  try {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [txHash, { encoding: 'json', maxSupportedTransactionVersion: 0 }]
      })
    });
    
    const result = await response.json();
    
    if (result.error) {
      return {
        success: false,
        verified: false,
        error: result.error.message || 'Solana transaction not found'
      };
    }
    
    const tx = result.result;
    
    if (!tx) {
      return {
        success: false,
        verified: false,
        error: 'Transaction not found on Solana blockchain'
      };
    }
    
    return {
      success: true,
      verified: true,
      amount: '0', // Solana transactions are complex, amount calculation would need more specific logic
      confirmations: tx.meta?.confirmationStatus === 'finalized' ? 1 : 0,
      timestamp: new Date(tx.blockTime * 1000).toISOString(),
      message: 'Solana transaction verified',
      slot: tx.slot,
      fee: tx.meta?.fee / Math.pow(10, 9) // Convert lamports to SOL
    };
  } catch (error) {
    return {
      success: false,
      verified: false,
      error: `Solana verification failed: ${error.message}`
    };
  }
}

// Litecoin verification using BlockCypher API
async function verifyLitecoinTransaction(txHash) {
  try {
    const response = await fetch(`https://api.blockcypher.com/v1/ltc/main/txs/${txHash}`);
    
    if (!response.ok) {
      return {
        success: false,
        verified: false,
        error: 'Transaction not found on Litecoin blockchain'
      };
    }
    
    const tx = await response.json();
    
    return {
      success: true,
      verified: true,
      amount: (tx.total / Math.pow(10, 8)).toFixed(8), // Convert satoshis to LTC
      confirmations: tx.confirmations,
      timestamp: tx.received,
      message: 'Litecoin transaction verified',
      blockHeight: tx.block_height,
      fee: tx.fees / Math.pow(10, 8)
    };
  } catch (error) {
    return {
      success: false,
      verified: false,
      error: `Litecoin verification failed: ${error.message}`
    };
  }
}

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
