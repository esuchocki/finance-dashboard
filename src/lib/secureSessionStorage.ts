/**
 * Secure Session Storage
 *
 * Provides password-protected encryption for session-only data storage.
 * All data is cleared when the browser tab/window closes.
 *
 * Features:
 * - AES-256 encryption
 * - Password-based key derivation (PBKDF2)
 * - Session-only storage (cleared on browser close)
 * - No password storage (key exists only in memory)
 * - Auto-cleanup on page unload
 */

import CryptoJS from 'crypto-js';

interface EncryptedData {
  ciphertext: string;
  salt: string;
  iv: string;
}

class SecureSessionStorage {
  private encryptionKey: string | null = null;
  private isAuthenticated: boolean = false;
  private readonly PBKDF2_ITERATIONS = 10000;

  /**
   * Initialize session with password
   * Creates encryption key from password (never stored)
   */
  public unlock(password: string): boolean {
    if (!password || password.length < 8) {
      return false;
    }

    // Generate salt for this session
    const salt = this.generateSalt();

    // Derive encryption key from password
    this.encryptionKey = this.deriveKey(password, salt);
    this.isAuthenticated = true;

    // Store salt in session (needed for encryption/decryption)
    sessionStorage.setItem('_session_salt', salt);

    // Setup cleanup on page unload
    this.setupCleanup();

    return true;
  }

  /**
   * Check if session is unlocked
   */
  public isUnlocked(): boolean {
    return this.isAuthenticated && this.encryptionKey !== null;
  }

  /**
   * Lock session and clear all data
   */
  public lock(): void {
    this.clearAll();
    this.encryptionKey = null;
    this.isAuthenticated = false;
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private deriveKey(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: this.PBKDF2_ITERATIONS,
    }).toString();
  }

  /**
   * Generate cryptographically secure random salt
   */
  private generateSalt(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }

  /**
   * Generate random initialization vector
   */
  private generateIV(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }

  /**
   * Encrypt data
   */
  private encrypt(data: string): EncryptedData {
    if (!this.encryptionKey) {
      throw new Error('Session is locked');
    }

    const salt = sessionStorage.getItem('_session_salt') || this.generateSalt();
    const iv = this.generateIV();

    const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey, {
      iv: CryptoJS.enc.Hex.parse(iv),
    });

    return {
      ciphertext: encrypted.toString(),
      salt,
      iv,
    };
  }

  /**
   * Decrypt data
   */
  private decrypt(encryptedData: EncryptedData): string {
    if (!this.encryptionKey) {
      throw new Error('Session is locked');
    }

    const decrypted = CryptoJS.AES.decrypt(
      encryptedData.ciphertext,
      this.encryptionKey,
      {
        iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
      }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Store encrypted item in sessionStorage
   */
  public setItem(key: string, value: any): void {
    if (!this.isUnlocked()) {
      throw new Error('Session is locked');
    }

    const jsonString = JSON.stringify(value);
    const encrypted = this.encrypt(jsonString);
    sessionStorage.setItem(`secure_${key}`, JSON.stringify(encrypted));
  }

  /**
   * Retrieve and decrypt item from sessionStorage
   */
  public getItem<T = any>(key: string): T | null {
    if (!this.isUnlocked()) {
      throw new Error('Session is locked');
    }

    const stored = sessionStorage.getItem(`secure_${key}`);
    if (!stored) return null;

    try {
      const encrypted: EncryptedData = JSON.parse(stored);
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (err) {
      console.error('Error decrypting data:', err);
      return null;
    }
  }

  /**
   * Remove item from sessionStorage
   */
  public removeItem(key: string): void {
    sessionStorage.removeItem(`secure_${key}`);
  }

  /**
   * Clear all encrypted data from sessionStorage
   */
  public clearAll(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('secure_') || key.startsWith('_session_')) {
        sessionStorage.removeItem(key);
      }
    });
  }

  /**
   * Setup cleanup handlers to clear data on page unload
   */
  private setupCleanup(): void {
    // Clear everything when page is closed/refreshed
    window.addEventListener('beforeunload', () => {
      this.clearAll();
      this.lock();
    });

    // Also clear on page hide (mobile/tab switch)
    window.addEventListener('pagehide', () => {
      this.clearAll();
      this.lock();
    });
  }

  /**
   * Get all stored keys (for debugging)
   */
  public getAllKeys(): string[] {
    const keys = Object.keys(sessionStorage);
    return keys
      .filter(key => key.startsWith('secure_'))
      .map(key => key.replace('secure_', ''));
  }
}

// Export singleton instance
export const secureSessionStorage = new SecureSessionStorage();

// Also export the class for testing
export { SecureSessionStorage };
