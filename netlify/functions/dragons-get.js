// netlify/functions/dragons-get.js
const { getStore } = require('@netlify/blobs');

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    const store = getStore('mitsugoshi');
    const data = await store.get('dragons', { type: 'json' });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data || []),
    };
  } catch (err) {
    console.error('Erro ao ler dragões:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao buscar dados.' }),
    };
  }
};
