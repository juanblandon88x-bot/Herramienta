// Netlify Function to proxy API requests
// This avoids CORS issues and allows access to the API from production

export const handler = async (event, context) => {
  // IMPORTANT: Change this to your PUBLIC API URL
  const API_URL = process.env.API_URL || 'https://test-zedd.onrender.com/1win';
  
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Netlify-Function-Proxy'
      }
    });

    const data = await response.text();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: data
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch from API',
        message: error.message 
      })
    };
  }
};
