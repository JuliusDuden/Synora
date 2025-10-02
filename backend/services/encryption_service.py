"""
End-to-End Encryption Service
Client-side encryption with user-derived keys
"""
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os
import secrets


class EncryptionService:
    """
    E2E Encryption service
    Note: In a true E2E system, encryption happens on the client side.
    This service provides utilities for key derivation and validation.
    """
    
    @staticmethod
    def derive_key_from_password(password: str, salt: bytes, iterations: int = 100000) -> bytes:
        """
        Derive encryption key from password using PBKDF2
        
        Args:
            password: User password
            salt: Salt for key derivation (should be stored per user)
            iterations: Number of iterations (higher = more secure but slower)
            
        Returns:
            32-byte key suitable for AES-256
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=iterations,
            backend=default_backend()
        )
        return kdf.derive(password.encode())
    
    @staticmethod
    def generate_salt() -> str:
        """Generate a random salt for key derivation"""
        return base64.b64encode(os.urandom(32)).decode('utf-8')
    
    @staticmethod
    def encrypt_data(data: str, key: bytes) -> str:
        """
        Encrypt data using AES-256-GCM
        
        Args:
            data: Plain text to encrypt
            key: 32-byte encryption key
            
        Returns:
            Base64 encoded: nonce + ciphertext + tag
        """
        # Generate random nonce (96 bits for GCM)
        nonce = os.urandom(12)
        
        # Create cipher
        aesgcm = AESGCM(key)
        
        # Encrypt (returns ciphertext + tag)
        ciphertext = aesgcm.encrypt(nonce, data.encode(), None)
        
        # Combine nonce + ciphertext and encode
        encrypted = nonce + ciphertext
        return base64.b64encode(encrypted).decode('utf-8')
    
    @staticmethod
    def decrypt_data(encrypted_data: str, key: bytes) -> str:
        """
        Decrypt data using AES-256-GCM
        
        Args:
            encrypted_data: Base64 encoded encrypted data
            key: 32-byte encryption key
            
        Returns:
            Decrypted plain text
            
        Raises:
            Exception: If decryption fails (wrong key or corrupted data)
        """
        try:
            # Decode from base64
            encrypted = base64.b64decode(encrypted_data)
            
            # Extract nonce (first 12 bytes) and ciphertext
            nonce = encrypted[:12]
            ciphertext = encrypted[12:]
            
            # Create cipher
            aesgcm = AESGCM(key)
            
            # Decrypt
            plaintext = aesgcm.decrypt(nonce, ciphertext, None)
            return plaintext.decode('utf-8')
        except Exception as e:
            raise Exception(f"Decryption failed: {str(e)}")
    
    @staticmethod
    def generate_encryption_key() -> str:
        """Generate a random 256-bit encryption key"""
        return base64.b64encode(secrets.token_bytes(32)).decode('utf-8')


# Client-side JavaScript equivalent would be:
"""
// Using Web Crypto API for client-side encryption

async function deriveKeyFromPassword(password, salt, iterations = 100000) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

async function encryptData(data, key) {
    const enc = new TextEncoder();
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        key,
        enc.encode(data)
    );
    
    // Combine nonce + encrypted
    const combined = new Uint8Array(nonce.length + encrypted.byteLength);
    combined.set(nonce, 0);
    combined.set(new Uint8Array(encrypted), nonce.length);
    
    return btoa(String.fromCharCode(...combined));
}

async function decryptData(encryptedData, key) {
    const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const nonce = encrypted.slice(0, 12);
    const ciphertext = encrypted.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: nonce },
        key,
        ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
}
"""
