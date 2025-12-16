import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth as _getAuth } from "firebase-admin/auth";
import { getFirestore as _getFirestore } from "firebase-admin/firestore";

function getCredentials() {
  // 1. Tenta ler a variável Base64 (A mais segura)
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64;

  if (b64) {
    try {
      const jsonStr = Buffer.from(b64, "base64").toString("utf8");
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Erro ao decodificar Base64:", e);
    }
  }

  // 2. Se não achou Base64, tenta o JSON bruto (se você usar Vercel no futuro pode precisar)
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    try {
      return JSON.parse(rawJson);
    } catch (e) { /* ignora */ }
  }

  return null;
}

function ensureAdmin() {
  if (!getApps().length) {
    const credentials = getCredentials();

    if (!credentials) {
      throw new Error(
        "FATAL: Credenciais do Firebase não encontradas.\n" +
        "Verifique se FIREBASE_SERVICE_ACCOUNT_JSON_B64 está no .env.local"
      );
    }

    try {
      initializeApp({
        credential: cert(credentials),
      });
      console.log("🔥 Firebase Admin conectado via Base64!");
    } catch (error) {
      console.error("Erro ao certificar credenciais:", error);
      throw error;
    }
  }
}

export function getAdmin() {
  ensureAdmin();
  return {
    auth: _getAuth(),
    db: _getFirestore(),
  };
}

export const adminAuth = getAdmin().auth;
export const db = getAdmin().db;