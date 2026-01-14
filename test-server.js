// Test script to verify server connectivity
const http = require('http');
const os = require('os');

// Get local IP addresses
const interfaces = os.networkInterfaces();
const localIPs = [];
console.log('Local IP addresses:');
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(`${name}: ${iface.address}`);
      localIPs.push(iface.address);
    }
  }
}

// Test connection to each IP address
console.log('\nTesting server connectivity:');
localIPs.forEach(ip => {
  const options = {
    hostname: ip,
    port: 3000,
    path: '/api/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`${ip}: Connection successful (status: ${res.statusCode})`);
    res.on('data', (d) => {
      console.log(`Response: ${d.toString()}`);
    });
  });

  req.on('error', (error) => {
    console.error(`${ip}: Connection failed - ${error.message}`);
  });

  req.end();
});

// Test localhost connection
console.log('\nTesting localhost connection:');
const localOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/health',
  method: 'GET'
};

const localReq = http.request(localOptions, (res) => {
  console.log(`localhost: Connection successful (status: ${res.statusCode})`);
  res.on('data', (d) => {
    console.log(`Response: ${d.toString()}`);
  });
});

localReq.on('error', (error) => {
  console.error(`localhost: Connection failed - ${error.message}`);
});

localReq.end();
