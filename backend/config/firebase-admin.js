const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

function normalizePrivateKey(rawKey) {
  if (!rawKey) return '';

  let normalized = rawKey.trim();

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }

  try {
    const parsed = JSON.parse(normalized);
    if (typeof parsed === 'string') {
      normalized = parsed;
    }
  } catch (_) {}

  return normalized
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, '\t')
    .trim();
}

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey && /BEGIN [A-Z ]*PRIVATE KEY/.test(privateKey)) {
    return {
      type: 'service_account',
      project_id: projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      private_key: privateKey,
      client_email: clientEmail,
      client_id: process.env.FIREBASE_CLIENT_ID || '',
      auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`
    };
  }

  const localPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(localPath)) {
    return require(localPath);
  }

  throw new Error('No Firebase credentials found. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Render, or keep serviceAccountKey.json locally.');
}

const serviceAccount = getServiceAccount();

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount)
    });

const db = getFirestore(app);
const auth = getAuth(app);

module.exports = {
  app,
  db,
  auth
};