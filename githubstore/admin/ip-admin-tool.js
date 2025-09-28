#!/usr/bin/env node

/**
 * GitHubStore IP Admin Tool
 * Command-line tool for managing IP blocking/whitelisting
 * 
 * Usage:
 *   node ip-admin-tool.js status
 *   node ip-admin-tool.js block <ip>
 *   node ip-admin-tool.js allow <ip>
 *   node ip-admin-tool.js remove <ip>
 *   node ip-admin-tool.js mode <whitelist|blacklist>
 */

const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const ADMIN_KEY = process.env.ADMIN_KEY || 'splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336';

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

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function logInfo(message) {
  console.log(colorize(`ℹ️  ${message}`, 'blue'));
}

function logSuccess(message) {
  console.log(colorize(`✅ ${message}`, 'green'));
}

function logError(message) {
  console.log(colorize(`❌ ${message}`, 'red'));
}

function logWarning(message) {
  console.log(colorize(`⚠️  ${message}`, 'yellow'));
}

function logHeader(message) {
  console.log(colorize(`\n🔧 ${message}`, 'cyan'));
  console.log(colorize('='.repeat(50), 'cyan'));
}

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
      throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return result;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to backend at ${BACKEND_URL}. Is the server running?`);
    }
    throw error;
  }
}

async function showStatus() {
  try {
    logHeader('IP Management Status');
    
    const result = await makeRequest('/api/admin/ip-status');
    const status = result.status;
    
    console.log(`\n📊 Mode: ${colorize(status.mode.toUpperCase(), status.mode === 'whitelist' ? 'green' : 'yellow')}`);
    console.log(`🚫 Blocked IPs: ${colorize(status.blockedCount.toString(), 'red')}`);
    console.log(`✅ Allowed IPs: ${colorize(status.allowedCount.toString(), 'green')}`);
    
    if (status.blockedIPs.length > 0) {
      console.log(`\n🚫 Blocked IP Addresses:`);
      status.blockedIPs.forEach(ip => {
        console.log(`   ${colorize(ip, 'red')}`);
      });
    }
    
    if (status.allowedIPs.length > 0) {
      console.log(`\n✅ Allowed IP Addresses:`);
      status.allowedIPs.forEach(ip => {
        console.log(`   ${colorize(ip, 'green')}`);
      });
    }
    
    if (status.blockedIPs.length === 0 && status.allowedIPs.length === 0) {
      console.log(`\n${colorize('No IPs configured yet', 'yellow')}`);
    }
    
    console.log(`\n🌐 Backend URL: ${colorize(BACKEND_URL, 'blue')}`);
    
  } catch (error) {
    logError(`Failed to get status: ${error.message}`);
    process.exit(1);
  }
}

async function blockIP(ip) {
  if (!ip) {
    logError('IP address required');
    console.log('Usage: node ip-admin-tool.js block <ip>');
    process.exit(1);
  }
  
  try {
    logHeader(`Blocking IP: ${ip}`);
    
    const result = await makeRequest('/api/admin/block-ip', 'POST', { ip });
    
    logSuccess(result.message);
    
    // Show updated status
    await showStatus();
    
  } catch (error) {
    logError(`Failed to block IP: ${error.message}`);
    process.exit(1);
  }
}

async function allowIP(ip) {
  if (!ip) {
    logError('IP address required');
    console.log('Usage: node ip-admin-tool.js allow <ip>');
    process.exit(1);
  }
  
  try {
    logHeader(`Allowing IP: ${ip}`);
    
    const result = await makeRequest('/api/admin/allow-ip', 'POST', { ip });
    
    logSuccess(result.message);
    
    // Show updated status
    await showStatus();
    
  } catch (error) {
    logError(`Failed to allow IP: ${error.message}`);
    process.exit(1);
  }
}

async function removeIP(ip) {
  if (!ip) {
    logError('IP address required');
    console.log('Usage: node ip-admin-tool.js remove <ip>');
    process.exit(1);
  }
  
  try {
    logHeader(`Removing IP: ${ip}`);
    
    const result = await makeRequest('/api/admin/remove-ip', 'POST', { ip });
    
    logSuccess(result.message);
    
    // Show updated status
    await showStatus();
    
  } catch (error) {
    logError(`Failed to remove IP: ${error.message}`);
    process.exit(1);
  }
}

async function setMode(mode) {
  if (!mode || !['whitelist', 'blacklist'].includes(mode)) {
    logError('Invalid mode. Must be "whitelist" or "blacklist"');
    console.log('Usage: node ip-admin-tool.js mode <whitelist|blacklist>');
    process.exit(1);
  }
  
  try {
    logHeader(`Setting mode to: ${mode}`);
    
    const result = await makeRequest('/api/admin/set-mode', 'POST', { mode });
    
    logSuccess(result.message);
    
    // Show updated status
    await showStatus();
    
  } catch (error) {
    logError(`Failed to set mode: ${error.message}`);
    process.exit(1);
  }
}

function showHelp() {
  console.log(colorize('\n🔧 GitHubStore IP Admin Tool', 'cyan'));
  console.log(colorize('================================', 'cyan'));
  console.log(`\n${colorize('Usage:', 'bright')}`);
  console.log(`  node ip-admin-tool.js <command> [options]\n`);
  
  console.log(`${colorize('Commands:', 'bright')}`);
  console.log(`  ${colorize('status', 'green')}                    Show current IP management status`);
  console.log(`  ${colorize('block <ip>', 'green')}               Block an IP address`);
  console.log(`  ${colorize('allow <ip>', 'green')}               Allow an IP address`);
  console.log(`  ${colorize('remove <ip>', 'green')}              Remove IP from all lists`);
  console.log(`  ${colorize('mode <whitelist|blacklist>', 'green')} Set filtering mode`);
  console.log(`  ${colorize('help', 'green')}                     Show this help message\n`);
  
  console.log(`${colorize('Examples:', 'bright')}`);
  console.log(`  node ip-admin-tool.js status`);
  console.log(`  node ip-admin-tool.js block 192.168.1.100`);
  console.log(`  node ip-admin-tool.js allow 192.168.1.50`);
  console.log(`  node ip-admin-tool.js remove 192.168.1.100`);
  console.log(`  node ip-admin-tool.js mode whitelist\n`);
  
  console.log(`${colorize('Configuration:', 'bright')}`);
  console.log(`  Backend URL: ${colorize(BACKEND_URL, 'blue')}`);
  console.log(`  Admin Key: ${colorize(ADMIN_KEY.substring(0, 20) + '...', 'blue')}\n`);
  
  console.log(`${colorize('Notes:', 'bright')}`);
  console.log(`  • Make sure the backend server is running`);
  console.log(`  • Check your .env file for correct configuration`);
  console.log(`  • Use 'whitelist' mode to only allow specific IPs`);
  console.log(`  • Use 'blacklist' mode to block specific IPs (default)\n`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const option = args[1];
  
  console.log(colorize('🔧 GitHubStore IP Admin Tool', 'bright'));
  console.log(colorize(`Backend: ${BACKEND_URL}`, 'blue'));
  
  switch (command) {
    case 'status':
      await showStatus();
      break;
      
    case 'block':
      await blockIP(option);
      break;
      
    case 'allow':
      await allowIP(option);
      break;
      
    case 'remove':
      await removeIP(option);
      break;
      
    case 'mode':
      await setMode(option);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      if (!command) {
        logWarning('No command specified');
      } else {
        logError(`Unknown command: ${command}`);
      }
      console.log(`\nUse ${colorize('node ip-admin-tool.js help', 'green')} for usage information`);
      process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logError(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

// Run the tool
main().catch((error) => {
  logError(`Tool failed: ${error.message}`);
  process.exit(1);
});
