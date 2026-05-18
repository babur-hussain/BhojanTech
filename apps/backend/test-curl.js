const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/customers?limit=5',
  method: 'GET',
  headers: {
    // We need auth token. 
  }
};
