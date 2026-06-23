// netlify/functions/groq-chat.js
// Proxy seguro para o chat com IA do catálogo (Groq).
// A chave de API da Groq fica só nesta function, como variável de
// ambiente GROQ_API_KEY configurada no painel do Netlify — nunca é
// enviada para o navegador do cliente.

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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY não configurada nas variáveis de ambiente do Netlify.');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Assistente de IA não está configurado no servidor.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido.' }) };
  }

  const { messages, catalogSummary } = payload;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Histórico de mensagens ausente.' }) };
  }

  // Limita o tamanho do histórico para evitar abuso/custo excessivo
  const trimmedMessages = messages.slice(-20);

  const systemPrompt = `Você é o atendente virtual especializado da loja Mitsugoshi, que vende itens do jogo Dragon City (Orbs trocados por dragões).
Abaixo está a lista COMPLETA e ATUAL de dragões disponíveis no catálogo. Você SÓ pode recomendar dragões que estejam nesta lista — nunca invente nomes, habilidades ou raridades que não estejam aqui.
Se o cliente pedir algo que não existe no catálogo, diga isso com simpatia e sugira a opção mais próxima da lista.
Seja breve, simpático e direto, usando emojis com moderação. Responda sempre em português.

CATÁLOGO ATUAL:
${catalogSummary || 'O catálogo está vazio no momento.'}`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimmedMessages,
        ],
        temperature: 0.6,
        max_tokens: 500,
      }),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Erro da API Groq:', data);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Erro ao consultar o assistente de IA.' }),
      };
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || 'Desculpe, não consegui gerar uma resposta agora.';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error('Erro ao chamar a Groq:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro de conexão com o assistente de IA.' }),
    };
  }
};
