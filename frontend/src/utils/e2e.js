/**
 * End-to-End Encryption helpers using the Web Crypto API.
 *
 * Protocol:
 *   1. Each user generates an ECDH key pair (P-256) per conversation.
 *   2. The public key (JWK) is stored on the server via /api/dm/conversations/:id/keys.
 *   3. When both participants have published their public keys, each client
 *      derives a shared AES-GCM-256 secret using ECDH.
 *   4. Messages are encrypted client-side before sending and decrypted on receipt.
 *      The server only ever sees ciphertext.
 *
 * Storage:
 *   Private keys are kept in localStorage keyed by `e2e_<conversationId>`.
 *   If a user clears localStorage they lose the ability to decrypt old messages.
 */

const ALGO = { name: 'ECDH', namedCurve: 'P-256' };
const AES_ALGO = { name: 'AES-GCM', length: 256 };

/** localStorage key for a conversation's key pair */
const storageKey = (conversationId) => `e2e_${conversationId}`;

/**
 * Generate a new ECDH key pair and persist the private key in localStorage.
 * Returns the public key as a JWK object.
 */
export async function generateKeyPair(conversationId) {
  const keyPair = await crypto.subtle.generateKey(ALGO, true, ['deriveKey']);

  // Export private key to store locally
  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

  localStorage.setItem(storageKey(conversationId), JSON.stringify(privateJwk));

  return publicJwk;
}

/**
 * Get the stored private key JWK for a conversation, or null.
 */
export function getStoredPrivateKey(conversationId) {
  const raw = localStorage.getItem(storageKey(conversationId));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * Check if we have a key pair for this conversation.
 */
export function hasKeyPair(conversationId) {
  return !!getStoredPrivateKey(conversationId);
}

/**
 * Derive an AES-GCM key from our private key and the peer's public key.
 */
export async function deriveSharedKey(conversationId, peerPublicJwk) {
  const privateJwk = getStoredPrivateKey(conversationId);
  if (!privateJwk) throw new Error('No private key for this conversation');

  const privateKey = await crypto.subtle.importKey('jwk', privateJwk, ALGO, false, ['deriveKey']);
  const publicKey = await crypto.subtle.importKey('jwk', peerPublicJwk, ALGO, false, []);

  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    AES_ALGO,
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string. Returns { ciphertext: base64, iv: base64 }.
 */
export async function encryptMessage(sharedKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypt a ciphertext. Returns the plaintext string.
 */
export async function decryptMessage(sharedKey, ciphertextB64, ivB64) {
  try {
    const cipherBytes = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      cipherBytes
    );

    return new TextDecoder().decode(plainBuffer);
  } catch {
    return '🔒 Unable to decrypt';
  }
}
