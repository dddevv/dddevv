#!/usr/bin/env node

/**
 * GitHubStore IP Admin Tool
 * Secure command-line tool for managing IP blocking/allowing
 * Completely separate from web interface - no web exposure
 */

const readline = require('readline');
const crypto = require('crypto');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin-secret-key-2024';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function for colored output
function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to make HTTP requests
async function makeRequest(endpoint, method = 'GET', data = null) {
  try {
    const url = `${BACKEND_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_KEY
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    return result;
  } catch (error) {
    colorLog('red', `❌ Error: ${error.message}`);
    return null;
  }
}

// Helper function to prompt for input
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Display current IP status
async function showStatus() {
  colorLog('cyan', '\n🔍 Current IP Filtering Status:');
  console.log('─'.repeat(50));
  
  const result = await makeRequest('/api/admin/ip-status');
  if (result && result.status) {
    const status = result.status;
    
    colorLog('yellow', `Mode: ${status.mode.toUpperCase()}`);
    colorLog('red', `Blocked IPs: ${status.blockedCount}`);
    colorLog('green', `Allowed IPs: ${status.allowedCount}`);
    
    if (status.blockedIPs.length > 0) {
      colorLog('red', '\n🚫 Blocked IPs:');
      status.blockedIPs.forEach(ip => colorLog('red', `  • ${ip}`));
    }
    
    if (status.allowedIPs.length > 0) {
      colorLog('green', '\n✅ Allowed IPs:');
      status.allowedIPs.forEach(ip => colorLog('green', `  • ${ip}`));
    }
  }
}

// Block an IP address
async function blockIP() {
  const ip = await askQuestion('\n🚫 Enter IP address to block: ');
  
  if (!ip) {
    colorLog('red', '❌ No IP address provided');
    return;
  }

  // Validate IP format (basic validation)
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    colorLog('red', '❌ Invalid IP address format');
    return;
  }

  const result = await makeRequest('/api/admin/block-ip', 'POST', { ip });
  if (result) {
    colorLog('green', `✅ IP ${ip} blocked successfully`);
  }
}

// Allow an IP address
async function allowIP() {
  const ip = await askQuestion('\n✅ Enter IP address to allow: ');
  
  if (!ip) {
    colorLog('red', '❌ No IP address provided');
    return;
  }

  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    colorLog('red', '❌ Invalid IP address format');
    return;
  }

  const result = await makeRequest('/api/admin/allow-ip', 'POST', { ip });
  if (result) {
    colorLog('green', `✅ IP ${ip} allowed successfully`);
  }
}

// Remove IP from all lists
async function removeIP() {
  const ip = await askQuestion('\n🗑️ Enter IP address to remove from all lists: ');
  
  if (!ip) {
    colorLog('red', '❌ No IP address provided');
    return;
  }

  const result = await makeRequest('/api/admin/remove-ip', 'POST', { ip });
  if (result) {
    colorLog('green', `✅ IP ${ip} removed from all lists`);
  }
}

// Set filtering mode
async function setMode() {
  colorLog('yellow', '\n🔄 IP Filtering Modes:');
  colorLog('yellow', '1. Blacklist - Block specific IPs (default)');
  colorLog('yellow', '2. Whitelist - Only allow specific IPs');
  
  const choice = await askQuestion('\nSelect mode (1 or 2): ');
  
  let mode;
  if (choice === '1') {
    mode = 'blacklist';
  } else if (choice === '2') {
    mode = 'whitelist';
  } else {
    colorLog('red', '❌ Invalid choice');
    return;
  }

  const result = await makeRequest('/api/admin/set-mode', 'POST', { mode });
  if (result) {
    colorLog('green', `✅ IP filtering mode set to ${mode}`);
  }
}

// Test IP access
async function testIP() {
  const ip = await askQuestion('\n🧪 Enter IP address to test: ');
  
  if (!ip) {
    colorLog('red', '❌ No IP address provided');
    return;
  }

  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    colorLog('red', '❌ Invalid IP address format');
    return;
  }

  // Get current status to check if IP would be allowed
  const result = await makeRequest('/api/admin/ip-status');
  if (result && result.status) {
    const status = result.status;
    let allowed = false;

    if (status.mode === 'whitelist') {
      allowed = status.allowedIPs.includes(ip) || status.allowedIPs.length === 0;
    } else {
      allowed = !status.blockedIPs.includes(ip);
    }

    if (allowed) {
      colorLog('green', `✅ IP ${ip} would be ALLOWED with current settings`);
    } else {
      colorLog('red', `🚫 IP ${ip} would be BLOCKED with current settings`);
    }
  }
}

// Generate secure admin key
function generateAdminKey() {
  const randomBytes = crypto.randomBytes(32);
  const adminKey = 'githubstore_admin_' + randomBytes.toString('hex');
  
  colorLog('cyan', '\n🔐 Generated Admin Key:');
  colorLog('bright', adminKey);
  colorLog('yellow', '\n⚠️  Add this to your .env file:');
  colorLog('bright', `ADMIN_KEY=${adminKey}`);
  colorLog('red', '\n🚨 Keep this key secret and never share it!');
}

// Main menu
async function showMenu() {
  console.clear();
  colorLog('cyan', '🛡️  GitHubStore IP Admin Tool');
  colorLog('yellow', '═'.repeat(40));
  colorLog('cyan', 'Backend URL: ' + BACKEND_URL);
  colorLog('cyan', 'Admin Key: ' + ADMIN_KEY.substring(0, 20) + '...');
  colorLog('yellow', '═'.repeat(40));
  
  console.log('\n📋 Available Commands:');
  console.log('  1. Show Status');
  console.log('  2. Block IP');
  console.log('  3. Allow IP');
  console.log('  4. Remove IP');
  console.log('  5. Set Mode');
  console.log('  6. Test IP');
  console.log('  7. Generate Admin Key');
  console.log('  8. Exit');
  
  const choice = await askQuestion('\n🔧 Select option (1-8): ');
  
  switch (choice) {
    case '1':
      await showStatus();
      break;
    case '2':
      await blockIP();
      break;
    case '3':
      await allowIP();
      break;
    case '4':
      await removeIP();
      break;
    case '5':
      await setMode();
      break;
    case '6':
      await testIP();
      break;
    case '7':
      generateAdminKey();
      break;
    case '8':
      colorLog('green', '\n👋 Goodbye!');
      rl.close();
      process.exit(0);
      break;
    default:
      colorLog('red', '\n❌ Invalid option');
  }
  
  if (choice !== '8') {
    await askQuestion('\n⏎ Press Enter to continue...');
    await showMenu();
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This tool requires Node.js 18+ or install node-fetch');
  process.exit(1);
}

// Start the admin tool
console.log('🚀 Starting GitHubStore IP Admin Tool...');
showMenu().catch(error => {
  colorLog('red', `❌ Fatal error: ${error.message}`);
  process.exit(1);
});
