// netlify/functions/dragons-save.js
// Salva a lista de dragões no Netlify Blobs.
// Endpoint protegido — exige header 'x-admin-key' igual à variável de
// ambiente ADMIN_SECRET configurada no painel do Netlify (nunca no código).

const { getStore } = require('@netlify/blobs');

// Helper: cria o store tentando a auto-injeção do ambiente primeiro;
// se faltar configuração, usa siteID/token manuais (variáveis de ambiente
// BLOBS_SITE_ID e BLOBS_TOKEN configuradas no painel do Netlify).
function getMitsugoshiStore() {
  if (process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN) {
    return getStore({
      name: 'mitsugoshi',
      siteID: process.env.BLOBS_SITE_ID,
      token: process.env.BLOBS_TOKEN,
    });
  }
  return getStore('mitsugoshi');
}

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

  // ── Verificação da senha de admin ──────────────────────────────
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

  // ── Validação do corpo ──────────────────────────────────────────
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
    const store = getMitsugoshiStore();
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
