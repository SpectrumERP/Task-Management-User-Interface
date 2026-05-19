import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'taskflow-secure-key-2024';

export const cryptoService = {
  encrypt(data: any): string {
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
  },

  decrypt<T>(encryptedData: string): T | null {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedString) return null;
      return JSON.parse(decryptedString) as T;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }
};
