// Netlify Function to proxy API requests
// This avoids CORS issues and allows access to the API from production

const https = require('https');
const http = require('http');

exports.handler = async (event, context) => {
  // IMPORTANT: Change this to your PUBLIC API URL
  // Options:
  // 1. Use ngrok: run "ngrok http 8001" and use the URL like "https://abc123.ngrok.io/1win"
  // 2. Use a public server IP/domain
  // 3. Deploy your API to a cloud service
  const API_URL = process.env.API_URL || 'http://100.84.144.118:8001/1win';
  
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Netlify-Function-Proxy'
      }
    };
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      console.error('Proxy error:', error);
      resolve({
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Failed to fetch from API',
          message: error.message 
        })
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 504,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Request timeout' })
      });
    });
    
    req.end();
  });
};

