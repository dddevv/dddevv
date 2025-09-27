// Simple test script to verify webhook functionality
require('dotenv').config();

async function testWebhook() {
  console.log('🧪 Testing Discord webhook connection...');
  
  if (!process.env.DISCORD_WEBHOOK_URL) {
    console.error('❌ DISCORD_WEBHOOK_URL not found in environment variables');
    console.log('💡 Make sure to create a .env file with your webhook URL');
    return;
  }

  try {
    const testEmbed = {
      title: "🧪 Backend Test",
      description: "Testing webhook connection from backend server",
      color: 0x00ff00,
      fields: [
        {
          name: "Test Status",
          value: "✅ Backend webhook test successful!",
          inline: false
        },
        {
          name: "Server Info",
          value: `**Node.js:** ${process.version}\n**Platform:** ${process.platform}\n**Timestamp:** ${new Date().toISOString()}`,
          inline: false
        }
      ],
      footer: { text: "SplintaxStore - Backend Test" }
    };

    console.log('📡 Sending test webhook...');
    
    const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ embeds: [testEmbed] })
    });

    if (response.ok) {
      console.log('✅ Test webhook sent successfully!');
      console.log(`📊 Response status: ${response.status}`);
    } else {
      console.error('❌ Webhook failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

// Run the test
testWebhook();
