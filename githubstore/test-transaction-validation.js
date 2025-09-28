/**
 * GitHubStore Transaction Validation Test
 * Tests the transaction ID validation and webhook endpoints
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'splintax_admin_9e3cf7ba59a4b9901492acbf23d1350f60c2624c089b5fd7c2c40fbc9d0ba336';

async function testTransactionValidation() {
  console.log('🧪 Testing Transaction ID Validation\n');

  const testCases = [
    {
      name: 'Valid Transaction ID',
      data: {
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerDiscord: 'john#1234'
      },
      expectedSuccess: true
    },
    {
      name: 'Transaction ID with spaces (should fail)',
      data: {
        transactionId: 'TXN 123456789',
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        customerDiscord: 'jane#5678'
      },
      expectedSuccess: false
    },
    {
      name: 'Duplicate Transaction ID (should fail)',
      data: {
        transactionId: 'TXN-DUPLICATE-TEST',
        customerName: 'Bob Smith',
        customerEmail: 'bob@example.com',
        customerDiscord: 'bob#9012'
      },
      expectedSuccess: true // First one should succeed
    },
    {
      name: 'Same Duplicate Transaction ID (should fail)',
      data: {
        transactionId: 'TXN-DUPLICATE-TEST', // Same as above
        customerName: 'Alice Smith',
        customerEmail: 'alice@example.com',
        customerDiscord: 'alice#3456'
      },
      expectedSuccess: false // Second one should fail
    },
    {
      name: 'Missing required fields (should fail)',
      data: {
        transactionId: `TXN-${Date.now()}-MISSING`,
        customerName: 'Charlie Brown'
        // Missing customerEmail
      },
      expectedSuccess: false
    },
    {
      name: 'Invalid API Key (should fail)',
      data: {
        transactionId: `TXN-${Date.now()}-INVALID`,
        customerName: 'David Wilson',
        customerEmail: 'david@example.com',
        customerDiscord: 'david#7890'
      },
      expectedSuccess: false,
      useInvalidKey: true
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Test ${i + 1}: ${testCase.name}`);
    console.log(`   Transaction ID: ${testCase.data.transactionId}`);

    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      // Use invalid key for the invalid key test
      if (testCase.useInvalidKey) {
        headers['x-api-key'] = 'invalid-key-test';
      } else {
        headers['x-api-key'] = API_KEY;
      }

      const response = await fetch(`${BASE_URL}/api/webhook/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testCase.data)
      });

      const result = await response.json();

      if (testCase.expectedSuccess) {
        if (response.ok && result.success) {
          console.log('   ✅ PASSED - Transaction processed successfully');
          passedTests++;
        } else {
          console.log(`   ❌ FAILED - Expected success but got: ${result.error || 'Unknown error'}`);
        }
      } else {
        if (!response.ok || !result.success) {
          console.log('   ✅ PASSED - Transaction correctly rejected');
          passedTests++;
        } else {
          console.log('   ❌ FAILED - Expected failure but transaction succeeded');
        }
      }

      // Show the response for debugging
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      } else if (result.success) {
        console.log(`   Success: ${result.message}`);
      }

    } catch (error) {
      console.log(`   ❌ FAILED - Network error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Transaction validation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the implementation.');
  }

  console.log('\n💡 Tips:');
  console.log('   - Make sure your backend server is running');
  console.log('   - Check that your API_KEY is correct');
  console.log('   - Verify your Discord webhook URL is configured');
  console.log('   - Check the server logs for detailed error information');
}

// Run the tests
testTransactionValidation().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});