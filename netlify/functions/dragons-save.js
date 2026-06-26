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
    const snapshot = await db.collection('dragons').get();
    const existingIds = snapshot.docs.map(doc => doc.id);
    const newIds = dragons.map(d => d.id);

    // IDs que você removeu no painel mas ainda estão no banco
    const idsToDelete = existingIds.filter(id => !newIds.includes(id));

    const batch = db.batch();

    // Deleta os que foram removidos
    idsToDelete.forEach(id => {
      batch.delete(db.collection('dragons').doc(id));
    });

    // Salva/Atualiza os que ficaram
    dragons.forEach(d => {
      const docRef = db.collection('dragons').doc(d.id);
      const tags = [
        ...d.nome.toLowerCase().split(' '),
        d.raridade.toLowerCase(),
        d.cat.toLowerCase()
      ].filter(t => t.length > 2);

      batch.set(docRef, { ...d, tags, updatedAt: Date.now() }, { merge: true });
    });

    await batch.commit();

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Erro ao sincronizar Firestore:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
