// netlify/functions/proxy.js

export const handler = async (event, context) => {
  // URL de la API remota (definir en Netlify env var o usar fallback)
  const API_URL = process.env.API_URL || 'https://test-zedd.onrender.com/1win';

  try {
    // Configurar método y body según la solicitud del frontend
    const options = {
      method: event.httpMethod, // GET, POST, etc.
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Netlify-Function-Proxy',
        'Content-Type': 'application/json'
      }
    };

    // Si es POST o PUT, pasar el body del frontend
    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      options.body = event.body;
    }

    // Hacer la petición a la API
    const response = await fetch(API_URL, options);

    // Intentar leer la respuesta como JSON
    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // permitir cualquier frontend
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify(data)
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
