const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}
const db = admin.firestore();

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const providedKey = event.headers['x-admin-key'] || event.headers['X-Admin-Key'];
  const expectedKey = process.env.ADMIN_SECRET;

  if (!providedKey || providedKey !== expectedKey) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Senha de admin inválida.' }) };
  }

  try {
    const dragons = JSON.parse(event.body || '[]');
    const chunks = [];
    for (let i = 0; i < dragons.length; i += 500) {
      chunks.push(dragons.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach(d => {
        const docId = d.id || d.nome.replace(/\s+/g, '-').toLowerCase();
        const docRef = db.collection('dragons').doc(docId);
        
        // Tags para busca inteligente da IA
        const tags = [
          ...d.nome.toLowerCase().split(' '),
          d.raridade.toLowerCase(),
          d.cat.toLowerCase()
        ].filter(t => t.length > 2);

        batch.set(docRef, { ...d, tags, updatedAt: Date.now() }, { merge: true });
      });
      await batch.commit();
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Erro ao salvar no Firestore:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
