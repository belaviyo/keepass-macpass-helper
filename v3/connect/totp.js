class TOTP {
  static hexToBuf(hex) {
    const a = hex.match(/[\dA-F]{2}/gi).map(c => parseInt(c, 16));
    return new Uint8Array(a);
  }
  static b32ToHex(base32) {
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let hex = '';
    for (let i = 0; i < base32.length; i++) {
      const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
      bits += val.toString(2).padStart(5, '0');
    }
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      const chunks = [bits.substr(i, 4), bits.substr(i + 4, 4)];
      for (const chunk of chunks) {
        hex += parseInt(chunk, 2).toString(16);
      }
    }

    return hex;
  }
  static decToHex(s) {
    return Math.round(s).toString(16);
  }
  static counter(period = 30) {
    const epoch = Math.round(Date.now() / 1000);
    return TOTP.decToHex(Math.floor(epoch / period)).padStart(16, '0');
  }
  async generate(secret, period = 30, digits = 6) {
    const {hexToBuf, b32ToHex, counter} = TOTP;

    const keyData = hexToBuf(b32ToHex(secret));
    const data = hexToBuf(counter(period));

    const prop = {
      name: 'HMAC',
      hash: 'SHA-1'
    };
    const key = await crypto.subtle.importKey('raw', keyData, prop, false, ['sign']);
    const signature = await crypto.subtle.sign(prop, key, data);

    // Now that we have the hash, we need to perform the HOTP specific byte selection
    // (called dynamic truncation in the RFC)
    const signatureArray = new Uint8Array(signature);
    const offset = signatureArray[signatureArray.length - 1] & 0xf;
    const binary = (
      (signatureArray[offset] & 0x7f) << 24) |
      ((signatureArray[offset + 1] & 0xff) << 16) |
      ((signatureArray[offset + 2] & 0xff) << 8) |
      (signatureArray[offset + 3] & 0xff);

    return binary.toString().slice(-1 * digits);
  }
}
