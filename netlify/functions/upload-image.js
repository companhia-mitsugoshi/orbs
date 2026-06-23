// netlify/functions/upload-image.js
// Proxy seguro para upload de imagens via ImgBB.
// A chave de API do ImgBB fica só nesta function, como variável de
// ambiente IMGBB_API_KEY configurada no painel do Netlify — nunca é
// enviada para o navegador do cliente.
//
// Recebe a imagem em base64 (vinda do admin.html) e devolve a URL
// pública final hospedada no ImgBB, para ser salva no dragão em vez
// do base64 puro (que inchava o localStorage e o Netlify Blobs).

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    console.error('IMGBB_API_KEY não configurada nas variáveis de ambiente do Netlify.');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Upload de imagem não está configurado no servidor.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido.' }) };
  }

  const { imageBase64 } = payload;
  if (!imageBase64) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Imagem ausente.' }) };
  }

  // O ImgBB espera o base64 puro, sem o prefixo "data:image/...;base64,"
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  try {
    const params = new URLSearchParams();
    params.append('image', cleanBase64);

    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await imgbbRes.json();

    if (!imgbbRes.ok || !data.success) {
      console.error('Erro da API ImgBB:', data);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Erro ao enviar imagem para hospedagem.' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: data.data.url }),
    };
  } catch (err) {
    console.error('Erro ao chamar a ImgBB:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro de conexão com o serviço de hospedagem de imagem.' }),
    };
  }
};
