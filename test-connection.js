// Test script to check server connectivity
const http = require('http');

// Test local connection
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Local connection status: ${res.statusCode}`);
  res.on('data', (d) => {
    console.log('Response:', d.toString());
  });
});

req.on('error', (error) => {
  console.error('Local connection error:', error.message);
});

req.end();

// Get local IP address
const os = require('os');
const interfaces = os.networkInterfaces();
console.log('\nLocal IP addresses:');
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(`${name}: ${iface.address}`);
    }
  }
}
