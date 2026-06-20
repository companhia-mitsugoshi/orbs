// netlify/functions/dragons-save.js
const { getStore } = require('@netlify/blobs');

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  const providedKey = event.headers['x-admin-key'] || event.headers['X-Admin-Key'];
  const expectedKey = process.env.ADMIN_SECRET;

  if (!expectedKey) {
    console.error('ADMIN_SECRET não configurada nas variáveis de ambiente do Netlify.');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Servidor não configurado corretamente.' }),
    };
  }

  if (!providedKey || providedKey !== expectedKey) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Senha de admin inválida ou ausente.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '[]');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido.' }) };
  }

  if (!Array.isArray(payload)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Esperado um array de dragões.' }) };
  }

  try {
    const store = getStore('mitsugoshi');
    await store.setJSON('dragons', payload);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, count: payload.length }),
    };
  } catch (err) {
    console.error('Erro ao salvar dragões:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao salvar dados.' }),
    };
  }
};