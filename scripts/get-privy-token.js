// Script to help you get your Privy token
console.log('🔑 To get your Privy token, follow these steps:\n');

console.log('1. Open your browser and go to https://app.ethos.network');
console.log('2. Log in to your account');
console.log('3. Open Developer Tools (F12)');
console.log('4. Go to the "Application" or "Storage" tab');
console.log('5. Look for "Cookies" under "app.ethos.network"');
console.log('6. Find the cookie named "privy-token"');
console.log('7. Copy the value of that cookie\n');

console.log('Then update the scripts with your token:');
console.log('- Replace <your_privy_token> in fetch-week13-batch.js');
console.log('- Replace <your_privy_token> in test-fast-batch.js\n');

console.log('Example:');
console.log('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n');

console.log('⚠️  Keep your token secure and don\'t share it publicly!');
console.log('💡 The token is needed because the Ethos API requires authentication for user data access.');
