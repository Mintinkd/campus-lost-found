const crypto = require('crypto');
const config = require('../config');

function encrypt(text) {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(config.encryption.key),
    Buffer.from(config.encryption.iv)
  );
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encryptedText) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(config.encryption.key),
    Buffer.from(config.encryption.iv)
  );
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
}

function getDecryptedMaskedPhone(encryptedPhone) {
  if (!encryptedPhone) return '';
  const phone = decrypt(encryptedPhone);
  return maskPhone(phone);
}

module.exports = { encrypt, decrypt, maskPhone, getDecryptedMaskedPhone };