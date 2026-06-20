// netlify/functions/dragons-get.js
// Devolve a lista de dragões salva no Netlify Blobs.
// Endpoint público de LEITURA — qualquer visitante do site pode chamar.

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    const store = getMitsugoshiStore();
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

