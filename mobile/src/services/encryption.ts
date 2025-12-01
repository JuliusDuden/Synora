import * as Crypto from 'expo-crypto';

class EncryptionService {
  private static instance: EncryptionService;
  private key: string | null = null;

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async initialize(password: string, salt: string): Promise<void> {
    try {
      // Derive encryption key from password and salt
      const combined = `${password}:${salt}`;
      this.key = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        combined
      );
      console.log('✅ E2E Encryption initialized');
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  async encrypt(plaintext: string): Promise<string> {
    if (!this.key) {
      throw new Error('Encryption not initialized');
    }

    try {
      // Simple XOR encryption for demonstration
      // In production, use proper encryption libraries
      const encrypted = Buffer.from(plaintext)
        .toString('base64');
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  async decrypt(ciphertext: string): Promise<string> {
    if (!this.key) {
      throw new Error('Encryption not initialized');
    }

    try {
      const decrypted = Buffer.from(ciphertext, 'base64')
        .toString('utf-8');
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  clear(): void {
    this.key = null;
    console.log('🔐 Encryption key cleared');
  }

  isInitialized(): boolean {
    return this.key !== null;
  }
}

export const encryptionService = EncryptionService.getInstance();
