/**
 * End-to-End Encryption Utilities
 * Uses Web Crypto API for client-side encryption
 */

export class EncryptionService {
  private static textEncoder = new TextEncoder();
  private static textDecoder = new TextDecoder();

  /**
   * Derive encryption key from password using PBKDF2
   */
  static async deriveKeyFromPassword(
    password: string,
    salt: string,
    iterations: number = 100000
  ): Promise<CryptoKey> {
    // Convert salt from base64
    const saltBuffer = this.base64ToBuffer(salt);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.textEncoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES-GCM key
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer.buffer as ArrayBuffer,
        iterations: iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  static async encrypt(data: string, key: CryptoKey): Promise<string> {
    // Generate random nonce (96 bits for GCM)
    const nonce = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
      },
      key,
      this.textEncoder.encode(data)
    );

    // Combine nonce + ciphertext
    const combined = new Uint8Array(nonce.length + encrypted.byteLength);
    combined.set(nonce, 0);
    combined.set(new Uint8Array(encrypted), nonce.length);

    // Convert to base64
    return this.bufferToBase64(combined);
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    try {
      // Convert from base64
      const encrypted = this.base64ToBuffer(encryptedData);

      // Extract nonce (first 12 bytes) and ciphertext
      const nonce = encrypted.slice(0, 12);
      const ciphertext = encrypted.slice(12);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
        },
        key,
        ciphertext
      );

      return this.textDecoder.decode(decrypted);
    } catch (error) {
      throw new Error('Decryption failed. Invalid key or corrupted data.');
    }
  }

  /**
   * Generate random salt for key derivation
   */
  static generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    return this.bufferToBase64(salt);
  }

  /**
   * Export key as base64 (for storage)
   */
  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.bufferToBase64(new Uint8Array(exported));
  }

  /**
   * Import key from base64
   */
  static async importKey(keyData: string): Promise<CryptoKey> {
    const buffer = this.base64ToBuffer(keyData);
    return await crypto.subtle.importKey(
      'raw',
      buffer.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Helper: Convert buffer to base64
   */
  private static bufferToBase64(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...Array.from(buffer)));
  }

  /**
   * Helper: Convert base64 to buffer
   */
  private static base64ToBuffer(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  /**
   * Hash password for verification (SHA-256)
   * Note: This is NOT for password storage (use bcrypt on backend)
   * This is for client-side key derivation verification
   */
  static async hashPassword(password: string): Promise<string> {
    const buffer = await crypto.subtle.digest(
      'SHA-256',
      this.textEncoder.encode(password)
    );
    return this.bufferToBase64(new Uint8Array(buffer));
  }
}

/**
 * Encryption Manager for the session
 * Manages the encryption key in memory during the session
 */
export class EncryptionManager {
  private static instance: EncryptionManager | null = null;
  private encryptionKey: CryptoKey | null = null;

  private constructor() {}

  static getInstance(): EncryptionManager {
    if (!this.instance) {
      this.instance = new EncryptionManager();
    }
    return this.instance;
  }

  /**
   * Initialize encryption with user password
   * Called after login
   */
  async initialize(password: string, salt: string): Promise<void> {
    this.encryptionKey = await EncryptionService.deriveKeyFromPassword(
      password,
      salt
    );
  }

  /**
   * Get the current encryption key
   */
  getKey(): CryptoKey | null {
    return this.encryptionKey;
  }

  /**
   * Check if encryption is initialized
   */
  isInitialized(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Clear encryption key from memory
   * Called on logout
   */
  clear(): void {
    this.encryptionKey = null;
  }

  /**
   * Encrypt data if key is available
   */
  async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized. Please log in again.');
    }
    return await EncryptionService.encrypt(data, this.encryptionKey);
  }

  /**
   * Decrypt data if key is available
   */
  async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized. Please log in again.');
    }
    return await EncryptionService.decrypt(encryptedData, this.encryptionKey);
  }
}
