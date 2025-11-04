/*! kdbxweb v2.1.1, (c) 2021 Antelle, opensource.org/licenses/MIT */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("crypto"), require("@xmldom/xmldom"));
	else if(typeof define === 'function' && define.amd)
		define(["crypto", "@xmldom/xmldom"], factory);
	else if(typeof exports === 'object')
		exports["kdbxweb"] = factory(require("crypto"), require("@xmldom/xmldom"));
	else
		root["kdbxweb"] = factory(root["crypto"], root["@xmldom/xmldom"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_crypto__, __WEBPACK_EXTERNAL_MODULE__xmldom_xmldom__) {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./crypto/chacha20.ts":
/*!****************************!*\
  !*** ./crypto/chacha20.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChaCha20 = void 0;
class ChaCha20 {
    constructor(key, nonce) {
        this._sigmaWords = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];
        this._block = new Uint8Array(64);
        this._blockUsed = 64;
        this._x = new Uint32Array(16);
        const input = new Uint32Array(16);
        input[0] = this._sigmaWords[0];
        input[1] = this._sigmaWords[1];
        input[2] = this._sigmaWords[2];
        input[3] = this._sigmaWords[3];
        input[4] = u8to32le(key, 0);
        input[5] = u8to32le(key, 4);
        input[6] = u8to32le(key, 8);
        input[7] = u8to32le(key, 12);
        input[8] = u8to32le(key, 16);
        input[9] = u8to32le(key, 20);
        input[10] = u8to32le(key, 24);
        input[11] = u8to32le(key, 28);
        input[12] = 0; // counter
        if (nonce.length === 12) {
            input[13] = u8to32le(nonce, 0);
            input[14] = u8to32le(nonce, 4);
            input[15] = u8to32le(nonce, 8);
        }
        else {
            input[13] = 0;
            input[14] = u8to32le(nonce, 0);
            input[15] = u8to32le(nonce, 4);
        }
        this._input = input;
    }
    getBytes(numberOfBytes) {
        const out = new Uint8Array(numberOfBytes);
        for (let i = 0; i < numberOfBytes; i++) {
            if (this._blockUsed === 64) {
                this.generateBlock();
                this._blockUsed = 0;
            }
            out[i] = this._block[this._blockUsed];
            this._blockUsed++;
        }
        return out;
    }
    generateBlock() {
        const input = this._input;
        const x = this._x;
        const block = this._block;
        x.set(input);
        for (let i = 20; i > 0; i -= 2) {
            quarterRound(x, 0, 4, 8, 12);
            quarterRound(x, 1, 5, 9, 13);
            quarterRound(x, 2, 6, 10, 14);
            quarterRound(x, 3, 7, 11, 15);
            quarterRound(x, 0, 5, 10, 15);
            quarterRound(x, 1, 6, 11, 12);
            quarterRound(x, 2, 7, 8, 13);
            quarterRound(x, 3, 4, 9, 14);
        }
        for (let i = 16; i--;) {
            x[i] += input[i];
        }
        for (let i = 16; i--;) {
            u32to8le(block, 4 * i, x[i]);
        }
        input[12] += 1;
        if (!input[12]) {
            input[13] += 1;
        }
    }
    encrypt(data) {
        const length = data.length;
        const res = new Uint8Array(length);
        let pos = 0;
        const block = this._block;
        while (pos < length) {
            this.generateBlock();
            const blockLength = Math.min(length - pos, 64);
            for (let i = 0; i < blockLength; i++) {
                res[pos] = data[pos] ^ block[i];
                pos++;
            }
        }
        return res;
    }
}
exports.ChaCha20 = ChaCha20;
function quarterRound(x, a, b, c, d) {
    x[a] += x[b];
    x[d] = rotate(x[d] ^ x[a], 16);
    x[c] += x[d];
    x[b] = rotate(x[b] ^ x[c], 12);
    x[a] += x[b];
    x[d] = rotate(x[d] ^ x[a], 8);
    x[c] += x[d];
    x[b] = rotate(x[b] ^ x[c], 7);
}
function u8to32le(x, i) {
    return x[i] | (x[i + 1] << 8) | (x[i + 2] << 16) | (x[i + 3] << 24);
}
function u32to8le(x, i, u) {
    x[i] = u;
    u >>>= 8;
    x[i + 1] = u;
    u >>>= 8;
    x[i + 2] = u;
    u >>>= 8;
    x[i + 3] = u;
}
function rotate(v, c) {
    return (v << c) | (v >>> (32 - c));
}


/***/ }),

/***/ "./crypto/crypto-engine.ts":
/*!*********************************!*\
  !*** ./crypto/crypto-engine.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.setArgon2Impl = exports.argon2 = exports.Argon2TypeArgon2id = exports.Argon2TypeArgon2d = exports.chacha20 = exports.random = exports.createAesCbc = exports.AesCbc = exports.hmacSha256 = exports.sha512 = exports.sha256 = void 0;
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
const chacha20_1 = __webpack_require__(/*! ./chacha20 */ "./crypto/chacha20.ts");
const nodeCrypto = __webpack_require__(/*! crypto */ "crypto");
const EmptySha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const EmptySha512 = 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce' +
    '47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e';
// maxRandomQuota is the max number of random bytes you can asks for from the cryptoEngine
// https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
const MaxRandomQuota = 65536;
function sha256(data) {
    var _a;
    if (!data.byteLength) {
        return Promise.resolve((0, byte_utils_1.arrayToBuffer)((0, byte_utils_1.hexToBytes)(EmptySha256)));
    }
    if ((_a = __webpack_require__.g.crypto) === null || _a === void 0 ? void 0 : _a.subtle) {
        return __webpack_require__.g.crypto.subtle.digest({ name: 'SHA-256' }, data);
    }
    else {
        return new Promise((resolve) => {
            const sha = nodeCrypto.createHash('sha256');
            const hash = sha.update(Buffer.from(data)).digest();
            resolve(hash.buffer);
        });
    }
}
exports.sha256 = sha256;
function sha512(data) {
    var _a;
    if (!data.byteLength) {
        return Promise.resolve((0, byte_utils_1.arrayToBuffer)((0, byte_utils_1.hexToBytes)(EmptySha512)));
    }
    if ((_a = __webpack_require__.g.crypto) === null || _a === void 0 ? void 0 : _a.subtle) {
        return __webpack_require__.g.crypto.subtle.digest({ name: 'SHA-512' }, data);
    }
    else {
        return new Promise((resolve) => {
            const sha = nodeCrypto.createHash('sha512');
            const hash = sha.update(Buffer.from(data)).digest();
            resolve(hash.buffer);
        });
    }
}
exports.sha512 = sha512;
function hmacSha256(key, data) {
    var _a;
    if ((_a = __webpack_require__.g.crypto) === null || _a === void 0 ? void 0 : _a.subtle) {
        const algo = { name: 'HMAC', hash: { name: 'SHA-256' } };
        return __webpack_require__.g.crypto.subtle
            .importKey('raw', key, algo, false, ['sign'])
            .then((subtleKey) => {
            return __webpack_require__.g.crypto.subtle.sign(algo, subtleKey, data);
        });
    }
    else {
        return new Promise((resolve) => {
            const hmac = nodeCrypto.createHmac('sha256', Buffer.from(key));
            const hash = hmac.update(Buffer.from(data)).digest();
            resolve(hash.buffer);
        });
    }
}
exports.hmacSha256 = hmacSha256;
class AesCbc {
}
exports.AesCbc = AesCbc;
class AesCbcSubtle extends AesCbc {
    get key() {
        if (!this._key) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'no key');
        }
        return this._key;
    }
    importKey(key) {
        return __webpack_require__.g.crypto.subtle
            .importKey('raw', key, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt'])
            .then((key) => {
            this._key = key;
        });
    }
    encrypt(data, iv) {
        return __webpack_require__.g.crypto.subtle.encrypt({ name: 'AES-CBC', iv }, this.key, data);
    }
    decrypt(data, iv) {
        return __webpack_require__.g.crypto.subtle.decrypt({ name: 'AES-CBC', iv }, this.key, data).catch(() => {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidKey, 'invalid key');
        });
    }
}
class AesCbcNode extends AesCbc {
    get key() {
        if (!this._key) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'no key');
        }
        return this._key;
    }
    importKey(key) {
        this._key = key;
        return Promise.resolve();
    }
    encrypt(data, iv) {
        return Promise.resolve().then(() => {
            const cipher = nodeCrypto.createCipheriv('aes-256-cbc', Buffer.from(this.key), Buffer.from(iv));
            const block = cipher.update(Buffer.from(data));
            return (0, byte_utils_1.arrayToBuffer)(Buffer.concat([block, cipher.final()]));
        });
    }
    decrypt(data, iv) {
        return Promise.resolve()
            .then(() => {
            const cipher = nodeCrypto.createDecipheriv('aes-256-cbc', Buffer.from(this.key), Buffer.from(iv));
            const block = cipher.update(Buffer.from(data));
            return (0, byte_utils_1.arrayToBuffer)(Buffer.concat([block, cipher.final()]));
        })
            .catch(() => {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidKey, 'invalid key');
        });
    }
}
function createAesCbc() {
    var _a;
    if ((_a = __webpack_require__.g.crypto) === null || _a === void 0 ? void 0 : _a.subtle) {
        return new AesCbcSubtle();
    }
    else {
        return new AesCbcNode();
    }
}
exports.createAesCbc = createAesCbc;
function safeRandomWeb(len) {
    const randomBytes = new Uint8Array(len);
    while (len > 0) {
        let segmentSize = len % MaxRandomQuota;
        segmentSize = segmentSize > 0 ? segmentSize : MaxRandomQuota;
        const randomBytesSegment = new Uint8Array(segmentSize);
        __webpack_require__.g.crypto.getRandomValues(randomBytesSegment);
        len -= segmentSize;
        randomBytes.set(randomBytesSegment, len);
    }
    return randomBytes;
}
function random(len) {
    var _a;
    if ((_a = __webpack_require__.g.crypto) === null || _a === void 0 ? void 0 : _a.subtle) {
        return safeRandomWeb(len);
    }
    else {
        return new Uint8Array(nodeCrypto.randomBytes(len));
    }
}
exports.random = random;
function chacha20(data, key, iv) {
    return Promise.resolve().then(() => {
        const algo = new chacha20_1.ChaCha20(new Uint8Array(key), new Uint8Array(iv));
        return (0, byte_utils_1.arrayToBuffer)(algo.encrypt(new Uint8Array(data)));
    });
}
exports.chacha20 = chacha20;
exports.Argon2TypeArgon2d = 0;
exports.Argon2TypeArgon2id = 2;
let argon2impl;
function argon2(password, salt, memory, iterations, length, parallelism, type, version) {
    if (argon2impl) {
        return argon2impl(password, salt, memory, iterations, length, parallelism, type, version).then(byte_utils_1.arrayToBuffer);
    }
    return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.NotImplemented, 'argon2 not implemented'));
}
exports.argon2 = argon2;
function setArgon2Impl(impl) {
    argon2impl = impl;
}
exports.setArgon2Impl = setArgon2Impl;


/***/ }),

/***/ "./crypto/hashed-block-transform.ts":
/*!******************************************!*\
  !*** ./crypto/hashed-block-transform.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.encrypt = exports.decrypt = void 0;
const binary_stream_1 = __webpack_require__(/*! ../utils/binary-stream */ "./utils/binary-stream.ts");
const CryptoEngine = __webpack_require__(/*! ../crypto/crypto-engine */ "./crypto/crypto-engine.ts");
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const BlockSize = 1024 * 1024;
function decrypt(data) {
    return Promise.resolve().then(() => {
        const stm = new binary_stream_1.BinaryStream(data);
        const buffers = [];
        let // blockIndex = 0,
        blockLength = 0, blockHash, totalLength = 0;
        const next = () => {
            /* blockIndex = */ stm.getUint32(true);
            blockHash = stm.readBytes(32);
            blockLength = stm.getUint32(true);
            if (blockLength > 0) {
                totalLength += blockLength;
                const blockData = stm.readBytes(blockLength);
                return CryptoEngine.sha256(blockData).then((calculatedHash) => {
                    if (!(0, byte_utils_1.arrayBufferEquals)(calculatedHash, blockHash)) {
                        throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'invalid hash block');
                    }
                    else {
                        buffers.push(blockData);
                        return next();
                    }
                });
            }
            else {
                const ret = new Uint8Array(totalLength);
                let offset = 0;
                for (let i = 0; i < buffers.length; i++) {
                    ret.set(new Uint8Array(buffers[i]), offset);
                    offset += buffers[i].byteLength;
                }
                return Promise.resolve(ret.buffer);
            }
        };
        return next();
    });
}
exports.decrypt = decrypt;
function encrypt(data) {
    return Promise.resolve().then(() => {
        let bytesLeft = data.byteLength;
        let currentOffset = 0, blockIndex = 0, totalLength = 0;
        const buffers = [];
        const next = () => {
            if (bytesLeft > 0) {
                const blockLength = Math.min(BlockSize, bytesLeft);
                bytesLeft -= blockLength;
                const blockData = data.slice(currentOffset, currentOffset + blockLength);
                return CryptoEngine.sha256(blockData).then((blockHash) => {
                    const blockBuffer = new ArrayBuffer(4 + 32 + 4);
                    const stm = new binary_stream_1.BinaryStream(blockBuffer);
                    stm.setUint32(blockIndex, true);
                    stm.writeBytes(blockHash);
                    stm.setUint32(blockLength, true);
                    buffers.push(blockBuffer);
                    totalLength += blockBuffer.byteLength;
                    buffers.push(blockData);
                    totalLength += blockData.byteLength;
                    blockIndex++;
                    currentOffset += blockLength;
                    return next();
                });
            }
            else {
                const endBlockData = new ArrayBuffer(4 + 32 + 4);
                const view = new DataView(endBlockData);
                view.setUint32(0, blockIndex, true);
                buffers.push(endBlockData);
                totalLength += endBlockData.byteLength;
                const ret = new Uint8Array(totalLength);
                let offset = 0;
                for (let i = 0; i < buffers.length; i++) {
                    ret.set(new Uint8Array(buffers[i]), offset);
                    offset += buffers[i].byteLength;
                }
                return Promise.resolve(ret.buffer);
            }
        };
        return next();
    });
}
exports.encrypt = encrypt;


/***/ }),

/***/ "./crypto/hmac-block-transform.ts":
/*!****************************************!*\
  !*** ./crypto/hmac-block-transform.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.encrypt = exports.decrypt = exports.getHmacKey = void 0;
const int64_1 = __webpack_require__(/*! ../utils/int64 */ "./utils/int64.ts");
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
const CryptoEngine = __webpack_require__(/*! ../crypto/crypto-engine */ "./crypto/crypto-engine.ts");
const binary_stream_1 = __webpack_require__(/*! ../utils/binary-stream */ "./utils/binary-stream.ts");
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const BlockSize = 1024 * 1024;
function getHmacKey(key, blockIndex) {
    const shaSrc = new Uint8Array(8 + key.byteLength);
    shaSrc.set(new Uint8Array(key), 8);
    const view = new DataView(shaSrc.buffer);
    view.setUint32(0, blockIndex.lo, true);
    view.setUint32(4, blockIndex.hi, true);
    return CryptoEngine.sha512((0, byte_utils_1.arrayToBuffer)(shaSrc)).then((sha) => {
        (0, byte_utils_1.zeroBuffer)(shaSrc);
        return sha;
    });
}
exports.getHmacKey = getHmacKey;
function getBlockHmac(key, blockIndex, blockLength, blockData) {
    return getHmacKey(key, new int64_1.Int64(blockIndex)).then((blockKey) => {
        const blockDataForHash = new Uint8Array(blockData.byteLength + 4 + 8);
        const blockDataForHashView = new DataView(blockDataForHash.buffer);
        blockDataForHash.set(new Uint8Array(blockData), 4 + 8);
        blockDataForHashView.setInt32(0, blockIndex, true);
        blockDataForHashView.setInt32(8, blockLength, true);
        return CryptoEngine.hmacSha256(blockKey, blockDataForHash.buffer);
    });
}
function decrypt(data, key) {
    const stm = new binary_stream_1.BinaryStream(data);
    return Promise.resolve().then(() => {
        const buffers = [];
        let blockIndex = 0, blockLength = 0, blockHash, totalLength = 0;
        const next = () => {
            blockHash = stm.readBytes(32);
            blockLength = stm.getUint32(true);
            if (blockLength > 0) {
                totalLength += blockLength;
                const blockData = stm.readBytes(blockLength);
                return getBlockHmac(key, blockIndex, blockLength, blockData).then((calculatedBlockHash) => {
                    if (!(0, byte_utils_1.arrayBufferEquals)(calculatedBlockHash, blockHash)) {
                        throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'invalid hash block');
                    }
                    else {
                        buffers.push(blockData);
                        blockIndex++;
                        return next();
                    }
                });
            }
            else {
                const ret = new Uint8Array(totalLength);
                let offset = 0;
                for (let i = 0; i < buffers.length; i++) {
                    ret.set(new Uint8Array(buffers[i]), offset);
                    offset += buffers[i].byteLength;
                }
                return Promise.resolve(ret.buffer);
            }
        };
        return next();
    });
}
exports.decrypt = decrypt;
function encrypt(data, key) {
    return Promise.resolve().then(() => {
        let bytesLeft = data.byteLength;
        let currentOffset = 0, blockIndex = 0, totalLength = 0;
        const buffers = [];
        const next = () => {
            const blockLength = Math.min(BlockSize, bytesLeft);
            bytesLeft -= blockLength;
            const blockData = data.slice(currentOffset, currentOffset + blockLength);
            return getBlockHmac(key, blockIndex, blockLength, blockData).then((blockHash) => {
                const blockBuffer = new ArrayBuffer(32 + 4);
                const stm = new binary_stream_1.BinaryStream(blockBuffer);
                stm.writeBytes(blockHash);
                stm.setUint32(blockLength, true);
                buffers.push(blockBuffer);
                totalLength += blockBuffer.byteLength;
                if (blockData.byteLength > 0) {
                    buffers.push(blockData);
                    totalLength += blockData.byteLength;
                    blockIndex++;
                    currentOffset += blockLength;
                    return next();
                }
                else {
                    const ret = new Uint8Array(totalLength);
                    let offset = 0;
                    for (let i = 0; i < buffers.length; i++) {
                        ret.set(new Uint8Array(buffers[i]), offset);
                        offset += buffers[i].byteLength;
                    }
                    return ret.buffer;
                }
            });
        };
        return next();
    });
}
exports.encrypt = encrypt;


/***/ }),

/***/ "./crypto/key-encryptor-aes.ts":
/*!*************************************!*\
  !*** ./crypto/key-encryptor-aes.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.encrypt = void 0;
const CryptoEngine = __webpack_require__(/*! ./crypto-engine */ "./crypto/crypto-engine.ts");
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
const maxRoundsPreIteration = 10000;
const aesBlockSize = 16;
const credentialSize = 32;
/*
In order to simulate multiple rounds of ECB encryption, we do CBC encryption
across a zero buffer of large length with the IV being the desired plaintext.
The zero buffer does not contribute to the xor, so xoring the previous block
with the next one simulates running ECB multiple times. We limit the maximum
size of the zero buffer to prevent enormous memory usage.
*/
function encrypt(credentials, key, rounds) {
    const algo = CryptoEngine.createAesCbc();
    return algo
        .importKey((0, byte_utils_1.arrayToBuffer)(key))
        .then(() => {
        const resolvers = [];
        for (let idx = 0; idx < credentialSize; idx += aesBlockSize) {
            resolvers.push(encryptBlock(algo, credentials.subarray(idx, idx + aesBlockSize), rounds));
        }
        return Promise.all(resolvers);
    })
        .then((results) => {
        const res = new Uint8Array(credentialSize);
        results.forEach((result, idx) => {
            const base = idx * aesBlockSize;
            for (let i = 0; i < aesBlockSize; ++i) {
                res[i + base] = result[i];
            }
            (0, byte_utils_1.zeroBuffer)(result);
        });
        return res;
    });
}
exports.encrypt = encrypt;
function encryptBlock(algo, iv, rounds) {
    let result = Promise.resolve((0, byte_utils_1.arrayToBuffer)(iv));
    const buffer = new Uint8Array(aesBlockSize * Math.min(rounds, maxRoundsPreIteration));
    while (rounds > 0) {
        const currentRounds = Math.min(rounds, maxRoundsPreIteration);
        rounds -= currentRounds;
        const dataLen = aesBlockSize * currentRounds;
        const zeroData = buffer.length === dataLen ? buffer.buffer : (0, byte_utils_1.arrayToBuffer)(buffer.subarray(0, dataLen));
        result = encryptBlockBuffer(algo, result, zeroData);
    }
    return result.then((res) => {
        return new Uint8Array(res);
    });
}
function encryptBlockBuffer(algo, promisedIv, buffer) {
    return promisedIv
        .then((iv) => {
        return algo.encrypt(buffer, iv);
    })
        .then((buf) => {
        const res = (0, byte_utils_1.arrayToBuffer)(new Uint8Array(buf).subarray(-2 * aesBlockSize, -aesBlockSize));
        (0, byte_utils_1.zeroBuffer)(buf);
        return res;
    });
}


/***/ }),

/***/ "./crypto/key-encryptor-kdf.ts":
/*!*************************************!*\
  !*** ./crypto/key-encryptor-kdf.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.encrypt = void 0;
const CryptoEngine = __webpack_require__(/*! ../crypto/crypto-engine */ "./crypto/crypto-engine.ts");
const KeyEncryptorAes = __webpack_require__(/*! ./key-encryptor-aes */ "./crypto/key-encryptor-aes.ts");
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
const int64_1 = __webpack_require__(/*! ../utils/int64 */ "./utils/int64.ts");
function encrypt(key, kdfParams) {
    const uuid = kdfParams.get('$UUID');
    if (!uuid || !(uuid instanceof ArrayBuffer)) {
        return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no kdf uuid'));
    }
    const kdfUuid = (0, byte_utils_1.bytesToBase64)(uuid);
    switch (kdfUuid) {
        case consts_1.KdfId.Argon2d:
            return encryptArgon2(key, kdfParams, CryptoEngine.Argon2TypeArgon2d);
        case consts_1.KdfId.Argon2id:
            return encryptArgon2(key, kdfParams, CryptoEngine.Argon2TypeArgon2id);
        case consts_1.KdfId.Aes:
            return encryptAes(key, kdfParams);
        default:
            return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.Unsupported, 'bad kdf'));
    }
}
exports.encrypt = encrypt;
function encryptArgon2(key, kdfParams, argon2type) {
    const salt = kdfParams.get('S');
    if (!(salt instanceof ArrayBuffer) || salt.byteLength !== 32) {
        return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad argon2 salt'));
    }
    const parallelism = toNumber(kdfParams.get('P'));
    if (typeof parallelism !== 'number' || parallelism < 1) {
        return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad argon2 parallelism'));
    }
    const iterations = toNumber(kdfParams.get('I'));
    if (typeof iterations !== 'number' || iterations < 1) {
        return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad argon2 iterations'));
    }
    const memory = toNumber(kdfParams.get('M'));
    if (typeof memory !== 'number' || memory < 1 || memory % 1024 !== 0) {
        return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad argon2 memory'));
    }
    const version = kdfParams.get('V');
    if (version !== 0x13 && version !== 0x10) {
        return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad argon2 version'));
    }
    const secretKey = kdfParams.get('K');
    if (secretKey) {
        return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.Unsupported, 'argon2 secret key'));
    }
    const assocData = kdfParams.get('A');
    if (assocData) {
        return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.Unsupported, 'argon2 assoc data'));
    }
    return CryptoEngine.argon2(key, salt, memory / 1024, iterations, 32, parallelism, argon2type, version);
}
function encryptAes(key, kdfParams) {
    const salt = kdfParams.get('S');
    if (!(salt instanceof ArrayBuffer) || salt.byteLength !== 32) {
        return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad aes salt'));
    }
    const rounds = toNumber(kdfParams.get('R'));
    if (typeof rounds !== 'number' || rounds < 1) {
        return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad aes rounds'));
    }
    return KeyEncryptorAes.encrypt(new Uint8Array(key), new Uint8Array(salt), rounds).then((key) => {
        return CryptoEngine.sha256(key).then((hash) => {
            (0, byte_utils_1.zeroBuffer)(key);
            return hash;
        });
    });
}
function toNumber(number) {
    if (typeof number === 'number') {
        return number;
    }
    else if (number instanceof int64_1.Int64) {
        return number.value;
    }
    return undefined;
}


/***/ }),

/***/ "./crypto/protect-salt-generator.ts":
/*!******************************************!*\
  !*** ./crypto/protect-salt-generator.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProtectSaltGenerator = void 0;
const salsa20_1 = __webpack_require__(/*! ./salsa20 */ "./crypto/salsa20.ts");
const chacha20_1 = __webpack_require__(/*! ./chacha20 */ "./crypto/chacha20.ts");
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const CryptoEngine = __webpack_require__(/*! ../crypto/crypto-engine */ "./crypto/crypto-engine.ts");
const SalsaNonce = new Uint8Array([0xe8, 0x30, 0x09, 0x4b, 0x97, 0x20, 0x5d, 0x2a]);
/**
 * Protect information used for decrypt and encrypt protected data fields
 * @constructor
 */
class ProtectSaltGenerator {
    constructor(algo) {
        this._algo = algo;
    }
    getSalt(len) {
        return (0, byte_utils_1.arrayToBuffer)(this._algo.getBytes(len));
    }
    static create(key, crsAlgorithm) {
        switch (crsAlgorithm) {
            case consts_1.CrsAlgorithm.Salsa20:
                return CryptoEngine.sha256((0, byte_utils_1.arrayToBuffer)(key)).then((hash) => {
                    const key = new Uint8Array(hash);
                    const algo = new salsa20_1.Salsa20(key, SalsaNonce);
                    return new ProtectSaltGenerator(algo);
                });
            case consts_1.CrsAlgorithm.ChaCha20:
                return CryptoEngine.sha512((0, byte_utils_1.arrayToBuffer)(key)).then((hash) => {
                    const key = new Uint8Array(hash, 0, 32);
                    const nonce = new Uint8Array(hash, 32, 12);
                    const algo = new chacha20_1.ChaCha20(key, nonce);
                    return new ProtectSaltGenerator(algo);
                });
            default:
                return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.Unsupported, 'crsAlgorithm'));
        }
    }
}
exports.ProtectSaltGenerator = ProtectSaltGenerator;


/***/ }),

/***/ "./crypto/protected-value.ts":
/*!***********************************!*\
  !*** ./crypto/protected-value.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProtectedValue = void 0;
const CryptoEngine = __webpack_require__(/*! ./crypto-engine */ "./crypto/crypto-engine.ts");
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
class ProtectedValue {
    constructor(value, salt) {
        this.value = new Uint8Array(value);
        this.salt = new Uint8Array(salt);
    }
    toString() {
        return (0, byte_utils_1.bytesToBase64)(this.value);
    }
    static fromString(str) {
        const bytes = (0, byte_utils_1.stringToBytes)(str), salt = CryptoEngine.random(bytes.length);
        for (let i = 0, len = bytes.length; i < len; i++) {
            bytes[i] ^= salt[i];
        }
        return new ProtectedValue((0, byte_utils_1.arrayToBuffer)(bytes), (0, byte_utils_1.arrayToBuffer)(salt));
    }
    toBase64() {
        const binary = this.getBinary();
        const base64 = (0, byte_utils_1.bytesToBase64)(binary);
        (0, byte_utils_1.zeroBuffer)(binary);
        return base64;
    }
    static fromBase64(base64) {
        const bytes = (0, byte_utils_1.base64ToBytes)(base64);
        return ProtectedValue.fromBinary(bytes);
    }
    /**
     * Keep in mind that you're passing the ownership of this array, the contents will be destroyed
     */
    static fromBinary(binary) {
        const bytes = new Uint8Array(binary), salt = CryptoEngine.random(bytes.length);
        for (let i = 0, len = bytes.length; i < len; i++) {
            bytes[i] ^= salt[i];
        }
        return new ProtectedValue((0, byte_utils_1.arrayToBuffer)(bytes), (0, byte_utils_1.arrayToBuffer)(salt));
    }
    includes(str) {
        if (str.length === 0) {
            return false;
        }
        const source = this.value, salt = this.salt, search = (0, byte_utils_1.stringToBytes)(str), sourceLen = source.length, searchLen = search.length, maxPos = sourceLen - searchLen;
        src: for (let sourceIx = 0; sourceIx <= maxPos; sourceIx++) {
            for (let searchIx = 0; searchIx < searchLen; searchIx++) {
                if ((source[sourceIx + searchIx] ^ salt[sourceIx + searchIx]) !==
                    search[searchIx]) {
                    continue src;
                }
            }
            return true;
        }
        return false;
    }
    getHash() {
        const binary = (0, byte_utils_1.arrayToBuffer)(this.getBinary());
        return CryptoEngine.sha256(binary).then((hash) => {
            (0, byte_utils_1.zeroBuffer)(binary);
            return hash;
        });
    }
    getText() {
        return (0, byte_utils_1.bytesToString)(this.getBinary());
    }
    getBinary() {
        const value = this.value, salt = this.salt;
        const bytes = new Uint8Array(value.byteLength);
        for (let i = bytes.length - 1; i >= 0; i--) {
            bytes[i] = value[i] ^ salt[i];
        }
        return bytes;
    }
    setSalt(newSalt) {
        const newSaltArr = new Uint8Array(newSalt);
        const value = this.value, salt = this.salt;
        for (let i = 0, len = value.length; i < len; i++) {
            value[i] = value[i] ^ salt[i] ^ newSaltArr[i];
            salt[i] = newSaltArr[i];
        }
    }
    clone() {
        return new ProtectedValue(this.value, this.salt);
    }
    get byteLength() {
        return this.value.byteLength;
    }
}
exports.ProtectedValue = ProtectedValue;


/***/ }),

/***/ "./crypto/salsa20.ts":
/*!***************************!*\
  !*** ./crypto/salsa20.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports) => {


// code from this gist: https://gist.github.com/dchest/4582374 (no license declared)
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Salsa20 = void 0;
class Salsa20 {
    constructor(key, nonce) {
        this._rounds = 20;
        this._sigmaWords = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];
        // State
        this._keyWords = []; // key words
        this._nonceWords = [0, 0]; // nonce words
        this._counterWords = [0, 0]; // block counter words
        // Output buffer
        this._block = new Uint8Array(64); // output block of 64 bytes
        this._blockUsed = 64; // number of block bytes used
        this.setKey(key);
        this.setNonce(nonce);
    }
    // setKey sets the key to the given 32-byte array.
    setKey(key) {
        for (let i = 0, j = 0; i < 8; i++, j += 4) {
            this._keyWords[i] =
                (key[j] & 0xff) |
                    ((key[j + 1] & 0xff) << 8) |
                    ((key[j + 2] & 0xff) << 16) |
                    ((key[j + 3] & 0xff) << 24);
        }
        this.reset();
    }
    // setNonce sets the nonce to the given 8-byte array.
    setNonce(nonce) {
        this._nonceWords[0] =
            (nonce[0] & 0xff) |
                ((nonce[1] & 0xff) << 8) |
                ((nonce[2] & 0xff) << 16) |
                ((nonce[3] & 0xff) << 24);
        this._nonceWords[1] =
            (nonce[4] & 0xff) |
                ((nonce[5] & 0xff) << 8) |
                ((nonce[6] & 0xff) << 16) |
                ((nonce[7] & 0xff) << 24);
        this.reset();
    }
    // getBytes returns the next numberOfBytes bytes of stream.
    getBytes(numberOfBytes) {
        const out = new Uint8Array(numberOfBytes);
        for (let i = 0; i < numberOfBytes; i++) {
            if (this._blockUsed === 64) {
                this.generateBlock();
                this.incrementCounter();
                this._blockUsed = 0;
            }
            out[i] = this._block[this._blockUsed];
            this._blockUsed++;
        }
        return out;
    }
    getHexString(numberOfBytes) {
        const hex = [
            '0',
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            'a',
            'b',
            'c',
            'd',
            'e',
            'f'
        ];
        const out = [];
        const bytes = this.getBytes(numberOfBytes);
        for (let i = 0; i < bytes.length; i++) {
            out.push(hex[(bytes[i] >> 4) & 15]);
            out.push(hex[bytes[i] & 15]);
        }
        return out.join('');
    }
    reset() {
        this._counterWords[0] = 0;
        this._counterWords[1] = 0;
        this._blockUsed = 64;
    }
    incrementCounter() {
        // Note: maximum 2^64 blocks.
        this._counterWords[0] = (this._counterWords[0] + 1) & 0xffffffff;
        if (this._counterWords[0] === 0) {
            this._counterWords[1] = (this._counterWords[1] + 1) & 0xffffffff;
        }
    }
    // _generateBlock generates 64 bytes from key, nonce, and counter,
    // and puts the result into this.block.
    generateBlock() {
        const j0 = this._sigmaWords[0], j1 = this._keyWords[0], j2 = this._keyWords[1], j3 = this._keyWords[2], j4 = this._keyWords[3], j5 = this._sigmaWords[1], j6 = this._nonceWords[0], j7 = this._nonceWords[1], j8 = this._counterWords[0], j9 = this._counterWords[1], j10 = this._sigmaWords[2], j11 = this._keyWords[4], j12 = this._keyWords[5], j13 = this._keyWords[6], j14 = this._keyWords[7], j15 = this._sigmaWords[3];
        let x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15;
        let u;
        for (let i = 0; i < this._rounds; i += 2) {
            u = x0 + x12;
            x4 ^= (u << 7) | (u >>> (32 - 7));
            u = x4 + x0;
            x8 ^= (u << 9) | (u >>> (32 - 9));
            u = x8 + x4;
            x12 ^= (u << 13) | (u >>> (32 - 13));
            u = x12 + x8;
            x0 ^= (u << 18) | (u >>> (32 - 18));
            u = x5 + x1;
            x9 ^= (u << 7) | (u >>> (32 - 7));
            u = x9 + x5;
            x13 ^= (u << 9) | (u >>> (32 - 9));
            u = x13 + x9;
            x1 ^= (u << 13) | (u >>> (32 - 13));
            u = x1 + x13;
            x5 ^= (u << 18) | (u >>> (32 - 18));
            u = x10 + x6;
            x14 ^= (u << 7) | (u >>> (32 - 7));
            u = x14 + x10;
            x2 ^= (u << 9) | (u >>> (32 - 9));
            u = x2 + x14;
            x6 ^= (u << 13) | (u >>> (32 - 13));
            u = x6 + x2;
            x10 ^= (u << 18) | (u >>> (32 - 18));
            u = x15 + x11;
            x3 ^= (u << 7) | (u >>> (32 - 7));
            u = x3 + x15;
            x7 ^= (u << 9) | (u >>> (32 - 9));
            u = x7 + x3;
            x11 ^= (u << 13) | (u >>> (32 - 13));
            u = x11 + x7;
            x15 ^= (u << 18) | (u >>> (32 - 18));
            u = x0 + x3;
            x1 ^= (u << 7) | (u >>> (32 - 7));
            u = x1 + x0;
            x2 ^= (u << 9) | (u >>> (32 - 9));
            u = x2 + x1;
            x3 ^= (u << 13) | (u >>> (32 - 13));
            u = x3 + x2;
            x0 ^= (u << 18) | (u >>> (32 - 18));
            u = x5 + x4;
            x6 ^= (u << 7) | (u >>> (32 - 7));
            u = x6 + x5;
            x7 ^= (u << 9) | (u >>> (32 - 9));
            u = x7 + x6;
            x4 ^= (u << 13) | (u >>> (32 - 13));
            u = x4 + x7;
            x5 ^= (u << 18) | (u >>> (32 - 18));
            u = x10 + x9;
            x11 ^= (u << 7) | (u >>> (32 - 7));
            u = x11 + x10;
            x8 ^= (u << 9) | (u >>> (32 - 9));
            u = x8 + x11;
            x9 ^= (u << 13) | (u >>> (32 - 13));
            u = x9 + x8;
            x10 ^= (u << 18) | (u >>> (32 - 18));
            u = x15 + x14;
            x12 ^= (u << 7) | (u >>> (32 - 7));
            u = x12 + x15;
            x13 ^= (u << 9) | (u >>> (32 - 9));
            u = x13 + x12;
            x14 ^= (u << 13) | (u >>> (32 - 13));
            u = x14 + x13;
            x15 ^= (u << 18) | (u >>> (32 - 18));
        }
        x0 += j0;
        x1 += j1;
        x2 += j2;
        x3 += j3;
        x4 += j4;
        x5 += j5;
        x6 += j6;
        x7 += j7;
        x8 += j8;
        x9 += j9;
        x10 += j10;
        x11 += j11;
        x12 += j12;
        x13 += j13;
        x14 += j14;
        x15 += j15;
        this._block[0] = (x0 >>> 0) & 0xff;
        this._block[1] = (x0 >>> 8) & 0xff;
        this._block[2] = (x0 >>> 16) & 0xff;
        this._block[3] = (x0 >>> 24) & 0xff;
        this._block[4] = (x1 >>> 0) & 0xff;
        this._block[5] = (x1 >>> 8) & 0xff;
        this._block[6] = (x1 >>> 16) & 0xff;
        this._block[7] = (x1 >>> 24) & 0xff;
        this._block[8] = (x2 >>> 0) & 0xff;
        this._block[9] = (x2 >>> 8) & 0xff;
        this._block[10] = (x2 >>> 16) & 0xff;
        this._block[11] = (x2 >>> 24) & 0xff;
        this._block[12] = (x3 >>> 0) & 0xff;
        this._block[13] = (x3 >>> 8) & 0xff;
        this._block[14] = (x3 >>> 16) & 0xff;
        this._block[15] = (x3 >>> 24) & 0xff;
        this._block[16] = (x4 >>> 0) & 0xff;
        this._block[17] = (x4 >>> 8) & 0xff;
        this._block[18] = (x4 >>> 16) & 0xff;
        this._block[19] = (x4 >>> 24) & 0xff;
        this._block[20] = (x5 >>> 0) & 0xff;
        this._block[21] = (x5 >>> 8) & 0xff;
        this._block[22] = (x5 >>> 16) & 0xff;
        this._block[23] = (x5 >>> 24) & 0xff;
        this._block[24] = (x6 >>> 0) & 0xff;
        this._block[25] = (x6 >>> 8) & 0xff;
        this._block[26] = (x6 >>> 16) & 0xff;
        this._block[27] = (x6 >>> 24) & 0xff;
        this._block[28] = (x7 >>> 0) & 0xff;
        this._block[29] = (x7 >>> 8) & 0xff;
        this._block[30] = (x7 >>> 16) & 0xff;
        this._block[31] = (x7 >>> 24) & 0xff;
        this._block[32] = (x8 >>> 0) & 0xff;
        this._block[33] = (x8 >>> 8) & 0xff;
        this._block[34] = (x8 >>> 16) & 0xff;
        this._block[35] = (x8 >>> 24) & 0xff;
        this._block[36] = (x9 >>> 0) & 0xff;
        this._block[37] = (x9 >>> 8) & 0xff;
        this._block[38] = (x9 >>> 16) & 0xff;
        this._block[39] = (x9 >>> 24) & 0xff;
        this._block[40] = (x10 >>> 0) & 0xff;
        this._block[41] = (x10 >>> 8) & 0xff;
        this._block[42] = (x10 >>> 16) & 0xff;
        this._block[43] = (x10 >>> 24) & 0xff;
        this._block[44] = (x11 >>> 0) & 0xff;
        this._block[45] = (x11 >>> 8) & 0xff;
        this._block[46] = (x11 >>> 16) & 0xff;
        this._block[47] = (x11 >>> 24) & 0xff;
        this._block[48] = (x12 >>> 0) & 0xff;
        this._block[49] = (x12 >>> 8) & 0xff;
        this._block[50] = (x12 >>> 16) & 0xff;
        this._block[51] = (x12 >>> 24) & 0xff;
        this._block[52] = (x13 >>> 0) & 0xff;
        this._block[53] = (x13 >>> 8) & 0xff;
        this._block[54] = (x13 >>> 16) & 0xff;
        this._block[55] = (x13 >>> 24) & 0xff;
        this._block[56] = (x14 >>> 0) & 0xff;
        this._block[57] = (x14 >>> 8) & 0xff;
        this._block[58] = (x14 >>> 16) & 0xff;
        this._block[59] = (x14 >>> 24) & 0xff;
        this._block[60] = (x15 >>> 0) & 0xff;
        this._block[61] = (x15 >>> 8) & 0xff;
        this._block[62] = (x15 >>> 16) & 0xff;
        this._block[63] = (x15 >>> 24) & 0xff;
    }
}
exports.Salsa20 = Salsa20;


/***/ }),

/***/ "./defs/consts.ts":
/*!************************!*\
  !*** ./defs/consts.ts ***!
  \************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Icons = exports.Defaults = exports.AutoTypeObfuscationOptions = exports.CipherId = exports.KdfId = exports.CrsAlgorithm = exports.CompressionAlgorithm = exports.ErrorCodes = exports.Signatures = void 0;
exports.Signatures = {
    FileMagic: 0x9aa2d903,
    Sig2Kdbx: 0xb54bfb67,
    Sig2Kdb: 0xb54bfb65
};
exports.ErrorCodes = {
    NotImplemented: 'NotImplemented',
    InvalidArg: 'InvalidArg',
    BadSignature: 'BadSignature',
    InvalidVersion: 'InvalidVersion',
    Unsupported: 'Unsupported',
    FileCorrupt: 'FileCorrupt',
    InvalidKey: 'InvalidKey',
    MergeError: 'MergeError',
    InvalidState: 'InvalidState'
};
exports.CompressionAlgorithm = {
    None: 0,
    GZip: 1
};
exports.CrsAlgorithm = {
    Null: 0,
    ArcFourVariant: 1,
    Salsa20: 2,
    ChaCha20: 3
};
exports.KdfId = {
    Argon2: '72Nt34wpREuR96mkA+MKDA==',
    Argon2d: '72Nt34wpREuR96mkA+MKDA==',
    Argon2id: 'nimLGVbbR3OyPfw+xvCh5g==',
    Aes: 'ydnzmmKKRGC/dA0IwYpP6g=='
};
exports.CipherId = {
    Aes: 'McHy5r9xQ1C+WAUhavxa/w==',
    ChaCha20: '1gOKK4tvTLWlJDOaMdu1mg=='
};
exports.AutoTypeObfuscationOptions = {
    None: 0,
    UseClipboard: 1
};
exports.Defaults = {
    KeyEncryptionRounds: 300000,
    MntncHistoryDays: 365,
    HistoryMaxItems: 10,
    HistoryMaxSize: 6 * 1024 * 1024,
    RecycleBinName: 'Recycle Bin'
};
exports.Icons = {
    Key: 0,
    World: 1,
    Warning: 2,
    NetworkServer: 3,
    MarkedDirectory: 4,
    UserCommunication: 5,
    Parts: 6,
    Notepad: 7,
    WorldSocket: 8,
    Identity: 9,
    PaperReady: 10,
    Digicam: 11,
    IRCommunication: 12,
    MultiKeys: 13,
    Energy: 14,
    Scanner: 15,
    WorldStar: 16,
    CDRom: 17,
    Monitor: 18,
    EMail: 19,
    Configuration: 20,
    ClipboardReady: 21,
    PaperNew: 22,
    Screen: 23,
    EnergyCareful: 24,
    EMailBox: 25,
    Disk: 26,
    Drive: 27,
    PaperQ: 28,
    TerminalEncrypted: 29,
    Console: 30,
    Printer: 31,
    ProgramIcons: 32,
    Run: 33,
    Settings: 34,
    WorldComputer: 35,
    Archive: 36,
    Homebanking: 37,
    DriveWindows: 39,
    Clock: 39,
    EMailSearch: 40,
    PaperFlag: 41,
    Memory: 42,
    TrashBin: 43,
    Note: 44,
    Expired: 45,
    Info: 46,
    Package: 47,
    Folder: 48,
    FolderOpen: 49,
    FolderPackage: 50,
    LockOpen: 51,
    PaperLocked: 52,
    Checked: 53,
    Pen: 54,
    Thumbnail: 55,
    Book: 56,
    List: 57,
    UserKey: 58,
    Tool: 59,
    Home: 60,
    Star: 61,
    Tux: 62,
    Feather: 63,
    Apple: 64,
    Wiki: 65,
    Money: 66,
    Certificate: 67,
    BlackBerry: 68
};


/***/ }),

/***/ "./defs/xml-names.ts":
/*!***************************!*\
  !*** ./defs/xml-names.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Val = exports.Attr = exports.Elem = void 0;
exports.Elem = {
    DocNode: 'KeePassFile',
    Meta: 'Meta',
    Root: 'Root',
    Group: 'Group',
    Entry: 'Entry',
    Generator: 'Generator',
    HeaderHash: 'HeaderHash',
    SettingsChanged: 'SettingsChanged',
    DbName: 'DatabaseName',
    DbNameChanged: 'DatabaseNameChanged',
    DbDesc: 'DatabaseDescription',
    DbDescChanged: 'DatabaseDescriptionChanged',
    DbDefaultUser: 'DefaultUserName',
    DbDefaultUserChanged: 'DefaultUserNameChanged',
    DbMntncHistoryDays: 'MaintenanceHistoryDays',
    DbColor: 'Color',
    DbKeyChanged: 'MasterKeyChanged',
    DbKeyChangeRec: 'MasterKeyChangeRec',
    DbKeyChangeForce: 'MasterKeyChangeForce',
    RecycleBinEnabled: 'RecycleBinEnabled',
    RecycleBinUuid: 'RecycleBinUUID',
    RecycleBinChanged: 'RecycleBinChanged',
    EntryTemplatesGroup: 'EntryTemplatesGroup',
    EntryTemplatesGroupChanged: 'EntryTemplatesGroupChanged',
    HistoryMaxItems: 'HistoryMaxItems',
    HistoryMaxSize: 'HistoryMaxSize',
    LastSelectedGroup: 'LastSelectedGroup',
    LastTopVisibleGroup: 'LastTopVisibleGroup',
    MemoryProt: 'MemoryProtection',
    ProtTitle: 'ProtectTitle',
    ProtUserName: 'ProtectUserName',
    ProtPassword: 'ProtectPassword',
    ProtUrl: 'ProtectURL',
    ProtNotes: 'ProtectNotes',
    CustomIcons: 'CustomIcons',
    CustomIconItem: 'Icon',
    CustomIconItemID: 'UUID',
    CustomIconItemData: 'Data',
    CustomIconItemName: 'Name',
    AutoType: 'AutoType',
    History: 'History',
    Name: 'Name',
    Notes: 'Notes',
    Uuid: 'UUID',
    Icon: 'IconID',
    CustomIconID: 'CustomIconUUID',
    FgColor: 'ForegroundColor',
    BgColor: 'BackgroundColor',
    OverrideUrl: 'OverrideURL',
    Times: 'Times',
    Tags: 'Tags',
    QualityCheck: 'QualityCheck',
    PreviousParentGroup: 'PreviousParentGroup',
    CreationTime: 'CreationTime',
    LastModTime: 'LastModificationTime',
    LastAccessTime: 'LastAccessTime',
    ExpiryTime: 'ExpiryTime',
    Expires: 'Expires',
    UsageCount: 'UsageCount',
    LocationChanged: 'LocationChanged',
    GroupDefaultAutoTypeSeq: 'DefaultAutoTypeSequence',
    EnableAutoType: 'EnableAutoType',
    EnableSearching: 'EnableSearching',
    String: 'String',
    Binary: 'Binary',
    Key: 'Key',
    Value: 'Value',
    AutoTypeEnabled: 'Enabled',
    AutoTypeObfuscation: 'DataTransferObfuscation',
    AutoTypeDefaultSeq: 'DefaultSequence',
    AutoTypeItem: 'Association',
    Window: 'Window',
    KeystrokeSequence: 'KeystrokeSequence',
    Binaries: 'Binaries',
    IsExpanded: 'IsExpanded',
    LastTopVisibleEntry: 'LastTopVisibleEntry',
    DeletedObjects: 'DeletedObjects',
    DeletedObject: 'DeletedObject',
    DeletionTime: 'DeletionTime',
    CustomData: 'CustomData',
    StringDictExItem: 'Item'
};
exports.Attr = {
    Id: 'ID',
    Ref: 'Ref',
    Protected: 'Protected',
    ProtectedInMemPlainXml: 'ProtectInMemory',
    Compressed: 'Compressed'
};
exports.Val = {
    False: 'False',
    True: 'True'
};


/***/ }),

/***/ "./errors/kdbx-error.ts":
/*!******************************!*\
  !*** ./errors/kdbx-error.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxError = void 0;
class KdbxError extends Error {
    constructor(code, message) {
        super('Error ' + code + (message ? ': ' + message : ''));
        this.name = 'KdbxError';
        this.code = code;
    }
}
exports.KdbxError = KdbxError;


/***/ }),

/***/ "./format/kdbx-binaries.ts":
/*!*********************************!*\
  !*** ./format/kdbx-binaries.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxBinaries = void 0;
const CryptoEngine = __webpack_require__(/*! ./../crypto/crypto-engine */ "./crypto/crypto-engine.ts");
const protected_value_1 = __webpack_require__(/*! ../crypto/protected-value */ "./crypto/protected-value.ts");
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
class KdbxBinaries {
    constructor() {
        // temporary map used during database loading
        this._mapById = new Map();
        // in runtime, entries are addressed by hash
        this._mapByHash = new Map();
        // kept to be able to find binaries by id as well
        this._idToHash = new Map();
    }
    computeHashes() {
        // this method is called after the file is loaded
        const promises = [...this._mapById].map(([id, binary]) => KdbxBinaries.getBinaryHash(binary).then((hash) => {
            this._idToHash.set(id, hash);
            this._mapByHash.set(hash, binary);
        }));
        return Promise.all(promises).then(() => {
            // it won't be used anymore
            this._mapById.clear();
        });
    }
    static getBinaryHash(binary) {
        let promise;
        if (binary instanceof protected_value_1.ProtectedValue) {
            promise = binary.getHash();
        }
        else {
            binary = (0, byte_utils_1.arrayToBuffer)(binary);
            promise = CryptoEngine.sha256(binary);
        }
        return promise.then(byte_utils_1.bytesToHex);
    }
    add(value) {
        // called after load
        if (value instanceof Uint8Array) {
            value = (0, byte_utils_1.arrayToBuffer)(value);
        }
        return KdbxBinaries.getBinaryHash(value).then((hash) => {
            this._mapByHash.set(hash, value);
            return { hash, value };
        });
    }
    addWithNextId(value) {
        // called during load (v4), when building the id map
        const id = this._mapById.size.toString();
        this.addWithId(id, value);
    }
    addWithId(id, value) {
        // called during load (v3), when building the id map
        if (value instanceof Uint8Array) {
            value = (0, byte_utils_1.arrayToBuffer)(value);
        }
        this._mapById.set(id, value);
    }
    addWithHash(binary) {
        this._mapByHash.set(binary.hash, binary.value);
    }
    deleteWithHash(hash) {
        this._mapByHash.delete(hash);
    }
    getByRef(binaryRef) {
        const hash = this._idToHash.get(binaryRef.ref);
        if (!hash) {
            return undefined;
        }
        const value = this._mapByHash.get(hash);
        if (!value) {
            return undefined;
        }
        return { hash, value };
    }
    getRefByHash(hash) {
        const ref = [...this._mapByHash.keys()].indexOf(hash);
        if (ref < 0) {
            return undefined;
        }
        return { ref: ref.toString() };
    }
    getAll() {
        return [...this._mapByHash.values()].map((value, index) => {
            return { ref: index.toString(), value };
        });
    }
    getAllWithHashes() {
        return [...this._mapByHash].map(([hash, value]) => ({
            hash,
            value
        }));
    }
    getValueByHash(hash) {
        return this._mapByHash.get(hash);
    }
    static isKdbxBinaryRef(binary) {
        var _a;
        return !!((_a = binary) === null || _a === void 0 ? void 0 : _a.ref);
    }
    static isKdbxBinaryWithHash(binary) {
        var _a;
        return !!((_a = binary) === null || _a === void 0 ? void 0 : _a.hash);
    }
}
exports.KdbxBinaries = KdbxBinaries;


/***/ }),

/***/ "./format/kdbx-context.ts":
/*!********************************!*\
  !*** ./format/kdbx-context.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxContext = void 0;
const XmlUtils = __webpack_require__(/*! ./../utils/xml-utils */ "./utils/xml-utils.ts");
class KdbxContext {
    constructor(opts) {
        this.kdbx = opts.kdbx;
        this.exportXml = !!opts.exportXml;
    }
    setXmlDate(node, dt) {
        const isBinary = this.kdbx.versionMajor >= 4 && !this.exportXml;
        XmlUtils.setDate(node, dt, isBinary);
    }
}
exports.KdbxContext = KdbxContext;


/***/ }),

/***/ "./format/kdbx-credentials.ts":
/*!************************************!*\
  !*** ./format/kdbx-credentials.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxCredentials = void 0;
const XmlUtils = __webpack_require__(/*! ../utils/xml-utils */ "./utils/xml-utils.ts");
const CryptoEngine = __webpack_require__(/*! ../crypto/crypto-engine */ "./crypto/crypto-engine.ts");
const protected_value_1 = __webpack_require__(/*! ../crypto/protected-value */ "./crypto/protected-value.ts");
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
class KdbxCredentials {
    constructor(password, keyFile, challengeResponse) {
        this.ready = Promise.all([
            this.setPassword(password),
            this.setKeyFile(keyFile),
            this.setChallengeResponse(challengeResponse)
        ]).then(() => this);
    }
    setPassword(password) {
        if (!password) {
            this.passwordHash = undefined;
            return Promise.resolve();
        }
        else if (password instanceof protected_value_1.ProtectedValue) {
            return password.getHash().then((hash) => {
                this.passwordHash = protected_value_1.ProtectedValue.fromBinary(hash);
            });
        }
        else {
            return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'password'));
        }
    }
    setKeyFile(keyFile) {
        if (keyFile && !(keyFile instanceof ArrayBuffer) && !(keyFile instanceof Uint8Array)) {
            return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'keyFile'));
        }
        if (keyFile) {
            if (keyFile.byteLength === 32) {
                this.keyFileHash = protected_value_1.ProtectedValue.fromBinary((0, byte_utils_1.arrayToBuffer)(keyFile));
                return Promise.resolve();
            }
            let keyFileVersion;
            let dataEl;
            try {
                const keyFileStr = (0, byte_utils_1.bytesToString)((0, byte_utils_1.arrayToBuffer)(keyFile));
                if (/^[a-f\d]{64}$/i.exec(keyFileStr)) {
                    const bytes = (0, byte_utils_1.hexToBytes)(keyFileStr);
                    this.keyFileHash = protected_value_1.ProtectedValue.fromBinary(bytes);
                    return Promise.resolve();
                }
                const xml = XmlUtils.parse(keyFileStr.trim());
                const metaEl = XmlUtils.getChildNode(xml.documentElement, 'Meta');
                if (!metaEl) {
                    return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'key file without meta'));
                }
                const versionEl = XmlUtils.getChildNode(metaEl, 'Version');
                if (!(versionEl === null || versionEl === void 0 ? void 0 : versionEl.textContent)) {
                    return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'key file without version'));
                }
                keyFileVersion = +versionEl.textContent.split('.')[0];
                const keyEl = XmlUtils.getChildNode(xml.documentElement, 'Key');
                if (!keyEl) {
                    return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'key file without key'));
                }
                dataEl = XmlUtils.getChildNode(keyEl, 'Data');
                if (!(dataEl === null || dataEl === void 0 ? void 0 : dataEl.textContent)) {
                    return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'key file without key data'));
                }
            }
            catch (e) {
                return CryptoEngine.sha256(keyFile).then((hash) => {
                    this.keyFileHash = protected_value_1.ProtectedValue.fromBinary(hash);
                });
            }
            switch (keyFileVersion) {
                case 1:
                    this.keyFileHash = protected_value_1.ProtectedValue.fromBinary((0, byte_utils_1.base64ToBytes)(dataEl.textContent));
                    break;
                case 2: {
                    const keyFileData = (0, byte_utils_1.hexToBytes)(dataEl.textContent.replace(/\s+/g, ''));
                    const keyFileDataHash = dataEl.getAttribute('Hash');
                    return CryptoEngine.sha256(keyFileData).then((computedHash) => {
                        const computedHashStr = (0, byte_utils_1.bytesToHex)(new Uint8Array(computedHash).subarray(0, 4)).toUpperCase();
                        if (computedHashStr !== keyFileDataHash) {
                            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'key file data hash mismatch');
                        }
                        this.keyFileHash = protected_value_1.ProtectedValue.fromBinary(keyFileData);
                    });
                }
                default: {
                    return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad keyfile version'));
                }
            }
        }
        else {
            this.keyFileHash = undefined;
        }
        return Promise.resolve();
    }
    setChallengeResponse(challengeResponse) {
        this._challengeResponse = challengeResponse;
        return Promise.resolve();
    }
    getHash(challenge) {
        return this.ready.then(() => {
            return this.getChallengeResponse(challenge).then((chalResp) => {
                const buffers = [];
                if (this.passwordHash) {
                    buffers.push(this.passwordHash.getBinary());
                }
                if (this.keyFileHash) {
                    buffers.push(this.keyFileHash.getBinary());
                }
                if (chalResp) {
                    buffers.push(new Uint8Array(chalResp));
                }
                const totalLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0);
                const allBytes = new Uint8Array(totalLength);
                let offset = 0;
                for (const buffer of buffers) {
                    allBytes.set(buffer, offset);
                    (0, byte_utils_1.zeroBuffer)(buffer);
                    offset += buffer.length;
                }
                return CryptoEngine.sha256((0, byte_utils_1.arrayToBuffer)(allBytes)).then((hash) => {
                    (0, byte_utils_1.zeroBuffer)(allBytes);
                    return hash;
                });
            });
        });
    }
    getChallengeResponse(challenge) {
        return Promise.resolve().then(() => {
            if (!this._challengeResponse || !challenge) {
                return null;
            }
            return this._challengeResponse(challenge).then((response) => {
                return CryptoEngine.sha256((0, byte_utils_1.arrayToBuffer)(response)).then((hash) => {
                    (0, byte_utils_1.zeroBuffer)(response);
                    return hash;
                });
            });
        });
    }
    static createRandomKeyFile(version = 1) {
        const keyLength = 32;
        const keyBytes = CryptoEngine.random(keyLength), salt = CryptoEngine.random(keyLength);
        for (let i = 0; i < keyLength; i++) {
            keyBytes[i] ^= salt[i];
            keyBytes[i] ^= (Math.random() * 1000) % 255;
        }
        return KdbxCredentials.createKeyFileWithHash(keyBytes, version);
    }
    static createKeyFileWithHash(keyBytes, version = 1) {
        const xmlVersion = version === 2 ? '2.0' : '1.00';
        const dataPadding = '        ';
        let makeDataElPromise;
        if (version === 2) {
            const keyDataPadding = dataPadding + '    ';
            makeDataElPromise = CryptoEngine.sha256(keyBytes).then((computedHash) => {
                const keyHash = (0, byte_utils_1.bytesToHex)(new Uint8Array(computedHash).subarray(0, 4)).toUpperCase();
                const keyStr = (0, byte_utils_1.bytesToHex)(keyBytes).toUpperCase();
                let dataElXml = dataPadding + '<Data Hash="' + keyHash + '">\n';
                for (let num = 0; num < 2; num++) {
                    const parts = [0, 1, 2, 3].map((ix) => {
                        return keyStr.substr(num * 32 + ix * 8, 8);
                    });
                    dataElXml += keyDataPadding;
                    dataElXml += parts.join(' ');
                    dataElXml += '\n';
                }
                dataElXml += dataPadding + '</Data>\n';
                return dataElXml;
            });
        }
        else {
            const dataElXml = dataPadding + '<Data>' + (0, byte_utils_1.bytesToBase64)(keyBytes) + '</Data>\n';
            makeDataElPromise = Promise.resolve(dataElXml);
        }
        return makeDataElPromise.then((dataElXml) => {
            const xml = '<?xml version="1.0" encoding="utf-8"?>\n' +
                '<KeyFile>\n' +
                '    <Meta>\n' +
                '        <Version>' +
                xmlVersion +
                '</Version>\n' +
                '    </Meta>\n' +
                '    <Key>\n' +
                dataElXml +
                '    </Key>\n' +
                '</KeyFile>';
            return (0, byte_utils_1.stringToBytes)(xml);
        });
    }
}
exports.KdbxCredentials = KdbxCredentials;


/***/ }),

/***/ "./format/kdbx-custom-data.ts":
/*!************************************!*\
  !*** ./format/kdbx-custom-data.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxCustomData = void 0;
const XmlUtils = __webpack_require__(/*! ../utils/xml-utils */ "./utils/xml-utils.ts");
const XmlNames = __webpack_require__(/*! ../defs/xml-names */ "./defs/xml-names.ts");
class KdbxCustomData {
    static read(node) {
        const customData = new Map();
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            if (childNode.tagName === XmlNames.Elem.StringDictExItem) {
                this.readItem(childNode, customData);
            }
        }
        return customData;
    }
    static write(parentNode, ctx, customData) {
        if (!customData) {
            return;
        }
        const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.CustomData);
        for (const [key, item] of customData) {
            if (item === null || item === void 0 ? void 0 : item.value) {
                const itemNode = XmlUtils.addChildNode(node, XmlNames.Elem.StringDictExItem);
                XmlUtils.setText(XmlUtils.addChildNode(itemNode, XmlNames.Elem.Key), key);
                XmlUtils.setText(XmlUtils.addChildNode(itemNode, XmlNames.Elem.Value), item.value);
                if (item.lastModified && ctx.kdbx.versionIsAtLeast(4, 1)) {
                    XmlUtils.setDate(XmlUtils.addChildNode(itemNode, XmlNames.Elem.LastModTime), item.lastModified);
                }
            }
        }
    }
    static readItem(node, customData) {
        let key, value, lastModified;
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            switch (childNode.tagName) {
                case XmlNames.Elem.Key:
                    key = XmlUtils.getText(childNode);
                    break;
                case XmlNames.Elem.Value:
                    value = XmlUtils.getText(childNode);
                    break;
                case XmlNames.Elem.LastModTime:
                    lastModified = XmlUtils.getDate(childNode);
                    break;
            }
        }
        if (key && value !== undefined) {
            const item = { value };
            if (lastModified) {
                item.lastModified = lastModified;
            }
            customData.set(key, item);
        }
    }
}
exports.KdbxCustomData = KdbxCustomData;


/***/ }),

/***/ "./format/kdbx-deleted-object.ts":
/*!***************************************!*\
  !*** ./format/kdbx-deleted-object.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxDeletedObject = void 0;
const XmlUtils = __webpack_require__(/*! ../utils/xml-utils */ "./utils/xml-utils.ts");
const XmlNames = __webpack_require__(/*! ../defs/xml-names */ "./defs/xml-names.ts");
class KdbxDeletedObject {
    readNode(node) {
        switch (node.tagName) {
            case XmlNames.Elem.Uuid:
                this.uuid = XmlUtils.getUuid(node);
                break;
            case XmlNames.Elem.DeletionTime:
                this.deletionTime = XmlUtils.getDate(node);
                break;
        }
    }
    write(parentNode, ctx) {
        const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.DeletedObject);
        XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.Uuid), this.uuid);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.DeletionTime), this.deletionTime);
    }
    static read(xmlNode) {
        const obj = new KdbxDeletedObject();
        for (let i = 0, cn = xmlNode.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            if (childNode.tagName) {
                obj.readNode(childNode);
            }
        }
        return obj;
    }
}
exports.KdbxDeletedObject = KdbxDeletedObject;


/***/ }),

/***/ "./format/kdbx-entry.ts":
/*!******************************!*\
  !*** ./format/kdbx-entry.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxEntry = void 0;
const XmlNames = __webpack_require__(/*! ./../defs/xml-names */ "./defs/xml-names.ts");
const XmlUtils = __webpack_require__(/*! ./../utils/xml-utils */ "./utils/xml-utils.ts");
const kdbx_times_1 = __webpack_require__(/*! ./kdbx-times */ "./format/kdbx-times.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const protected_value_1 = __webpack_require__(/*! ../crypto/protected-value */ "./crypto/protected-value.ts");
const kdbx_custom_data_1 = __webpack_require__(/*! ./kdbx-custom-data */ "./format/kdbx-custom-data.ts");
const kdbx_uuid_1 = __webpack_require__(/*! ./kdbx-uuid */ "./format/kdbx-uuid.ts");
const kdbx_binaries_1 = __webpack_require__(/*! ./kdbx-binaries */ "./format/kdbx-binaries.ts");
class KdbxEntry {
    constructor() {
        this.uuid = new kdbx_uuid_1.KdbxUuid();
        this.tags = [];
        this.times = new kdbx_times_1.KdbxTimes();
        this.fields = new Map();
        this.binaries = new Map();
        this.autoType = {
            enabled: true,
            obfuscation: consts_1.AutoTypeObfuscationOptions.None,
            items: []
        };
        this.history = [];
    }
    get lastModTime() {
        var _a, _b;
        return (_b = (_a = this.times.lastModTime) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : 0;
    }
    get locationChanged() {
        var _a, _b;
        return (_b = (_a = this.times.locationChanged) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : 0;
    }
    readNode(node, ctx) {
        var _a, _b;
        switch (node.tagName) {
            case XmlNames.Elem.Uuid:
                this.uuid = (_a = XmlUtils.getUuid(node)) !== null && _a !== void 0 ? _a : new kdbx_uuid_1.KdbxUuid();
                break;
            case XmlNames.Elem.Icon:
                this.icon = XmlUtils.getNumber(node) || consts_1.Icons.Key;
                break;
            case XmlNames.Elem.CustomIconID:
                this.customIcon = XmlUtils.getUuid(node);
                break;
            case XmlNames.Elem.FgColor:
                this.fgColor = XmlUtils.getText(node);
                break;
            case XmlNames.Elem.BgColor:
                this.bgColor = XmlUtils.getText(node);
                break;
            case XmlNames.Elem.OverrideUrl:
                this.overrideUrl = XmlUtils.getText(node);
                break;
            case XmlNames.Elem.Tags:
                this.tags = XmlUtils.getTags(node);
                break;
            case XmlNames.Elem.Times:
                this.times = kdbx_times_1.KdbxTimes.read(node);
                break;
            case XmlNames.Elem.String:
                this.readField(node);
                break;
            case XmlNames.Elem.Binary:
                this.readBinary(node, ctx);
                break;
            case XmlNames.Elem.AutoType:
                this.readAutoType(node);
                break;
            case XmlNames.Elem.History:
                this.readHistory(node, ctx);
                break;
            case XmlNames.Elem.CustomData:
                this.readCustomData(node);
                break;
            case XmlNames.Elem.QualityCheck:
                this.qualityCheck = (_b = XmlUtils.getBoolean(node)) !== null && _b !== void 0 ? _b : undefined;
                break;
            case XmlNames.Elem.PreviousParentGroup:
                this.previousParentGroup = XmlUtils.getUuid(node);
                break;
        }
    }
    readField(node) {
        const keyNode = XmlUtils.getChildNode(node, XmlNames.Elem.Key), valueNode = XmlUtils.getChildNode(node, XmlNames.Elem.Value);
        if (keyNode && valueNode) {
            const key = XmlUtils.getText(keyNode), value = XmlUtils.getProtectedText(valueNode);
            if (key) {
                this.fields.set(key, value || '');
            }
        }
    }
    writeFields(parentNode) {
        for (const [field, value] of this.fields) {
            if (value !== undefined && value !== null) {
                const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.String);
                XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.Key), field);
                XmlUtils.setProtectedText(XmlUtils.addChildNode(node, XmlNames.Elem.Value), value);
            }
        }
    }
    readBinary(node, ctx) {
        const keyNode = XmlUtils.getChildNode(node, XmlNames.Elem.Key), valueNode = XmlUtils.getChildNode(node, XmlNames.Elem.Value);
        if (keyNode && valueNode) {
            const key = XmlUtils.getText(keyNode), value = XmlUtils.getProtectedBinary(valueNode);
            if (key && value) {
                if (kdbx_binaries_1.KdbxBinaries.isKdbxBinaryRef(value)) {
                    const binary = ctx.kdbx.binaries.getByRef(value);
                    if (binary) {
                        this.binaries.set(key, binary);
                    }
                }
                else {
                    this.binaries.set(key, value);
                }
            }
        }
    }
    writeBinaries(parentNode, ctx) {
        for (const [id, data] of this.binaries) {
            let bin;
            if (kdbx_binaries_1.KdbxBinaries.isKdbxBinaryWithHash(data)) {
                const binaryRef = ctx.kdbx.binaries.getRefByHash(data.hash);
                if (!binaryRef) {
                    return;
                }
                bin = binaryRef;
            }
            else {
                bin = data;
            }
            const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.Binary);
            XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.Key), id);
            XmlUtils.setProtectedBinary(XmlUtils.addChildNode(node, XmlNames.Elem.Value), bin);
        }
    }
    readAutoType(node) {
        var _a;
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            switch (childNode.tagName) {
                case XmlNames.Elem.AutoTypeEnabled:
                    this.autoType.enabled = (_a = XmlUtils.getBoolean(childNode)) !== null && _a !== void 0 ? _a : true;
                    break;
                case XmlNames.Elem.AutoTypeObfuscation:
                    this.autoType.obfuscation =
                        XmlUtils.getNumber(childNode) || consts_1.AutoTypeObfuscationOptions.None;
                    break;
                case XmlNames.Elem.AutoTypeDefaultSeq:
                    this.autoType.defaultSequence = XmlUtils.getText(childNode);
                    break;
                case XmlNames.Elem.AutoTypeItem:
                    this.readAutoTypeItem(childNode);
                    break;
            }
        }
    }
    readAutoTypeItem(node) {
        let window = '';
        let keystrokeSequence = '';
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            switch (childNode.tagName) {
                case XmlNames.Elem.Window:
                    window = XmlUtils.getText(childNode) || '';
                    break;
                case XmlNames.Elem.KeystrokeSequence:
                    keystrokeSequence = XmlUtils.getText(childNode) || '';
                    break;
            }
        }
        if (window && keystrokeSequence) {
            this.autoType.items.push({ window, keystrokeSequence });
        }
    }
    writeAutoType(parentNode) {
        const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.AutoType);
        XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.AutoTypeEnabled), this.autoType.enabled);
        XmlUtils.setNumber(XmlUtils.addChildNode(node, XmlNames.Elem.AutoTypeObfuscation), this.autoType.obfuscation || consts_1.AutoTypeObfuscationOptions.None);
        if (this.autoType.defaultSequence) {
            XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.AutoTypeDefaultSeq), this.autoType.defaultSequence);
        }
        for (let i = 0; i < this.autoType.items.length; i++) {
            const item = this.autoType.items[i];
            const itemNode = XmlUtils.addChildNode(node, XmlNames.Elem.AutoTypeItem);
            XmlUtils.setText(XmlUtils.addChildNode(itemNode, XmlNames.Elem.Window), item.window);
            XmlUtils.setText(XmlUtils.addChildNode(itemNode, XmlNames.Elem.KeystrokeSequence), item.keystrokeSequence);
        }
    }
    readHistory(node, ctx) {
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            switch (childNode.tagName) {
                case XmlNames.Elem.Entry:
                    this.history.push(KdbxEntry.read(childNode, ctx));
                    break;
            }
        }
    }
    writeHistory(parentNode, ctx) {
        const historyNode = XmlUtils.addChildNode(parentNode, XmlNames.Elem.History);
        for (const historyEntry of this.history) {
            historyEntry.write(historyNode, ctx);
        }
    }
    readCustomData(node) {
        this.customData = kdbx_custom_data_1.KdbxCustomData.read(node);
    }
    writeCustomData(parentNode, ctx) {
        if (this.customData) {
            kdbx_custom_data_1.KdbxCustomData.write(parentNode, ctx, this.customData);
        }
    }
    setField(name, str, secure = false) {
        this.fields.set(name, secure ? protected_value_1.ProtectedValue.fromString(str) : str);
    }
    addHistoryTombstone(isAdded, dt) {
        if (!this._editState) {
            this._editState = { added: [], deleted: [] };
        }
        this._editState[isAdded ? 'added' : 'deleted'].push(dt.getTime());
    }
    write(parentNode, ctx) {
        const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.Entry);
        XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.Uuid), this.uuid);
        XmlUtils.setNumber(XmlUtils.addChildNode(node, XmlNames.Elem.Icon), this.icon || consts_1.Icons.Key);
        if (this.customIcon) {
            XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.CustomIconID), this.customIcon);
        }
        XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.FgColor), this.fgColor);
        XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.BgColor), this.bgColor);
        XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.OverrideUrl), this.overrideUrl);
        XmlUtils.setTags(XmlUtils.addChildNode(node, XmlNames.Elem.Tags), this.tags);
        if (typeof this.qualityCheck === 'boolean' && ctx.kdbx.versionIsAtLeast(4, 1)) {
            XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.QualityCheck), this.qualityCheck);
        }
        if (this.previousParentGroup !== undefined && ctx.kdbx.versionIsAtLeast(4, 1)) {
            XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.PreviousParentGroup), this.previousParentGroup);
        }
        this.times.write(node, ctx);
        this.writeFields(node);
        this.writeBinaries(node, ctx);
        this.writeAutoType(node);
        this.writeCustomData(node, ctx);
        if (parentNode.tagName !== XmlNames.Elem.History) {
            this.writeHistory(node, ctx);
        }
    }
    pushHistory() {
        const historyEntry = new KdbxEntry();
        historyEntry.copyFrom(this);
        this.history.push(historyEntry);
        if (historyEntry.times.lastModTime) {
            this.addHistoryTombstone(true, historyEntry.times.lastModTime);
        }
    }
    removeHistory(index, count = 1) {
        for (let ix = index; ix < index + count; ix++) {
            if (ix < this.history.length) {
                const lastModTime = this.history[ix].times.lastModTime;
                if (lastModTime) {
                    this.addHistoryTombstone(false, lastModTime);
                }
            }
        }
        this.history.splice(index, count);
    }
    copyFrom(entry) {
        this.uuid = entry.uuid;
        this.icon = entry.icon;
        this.customIcon = entry.customIcon;
        this.fgColor = entry.fgColor;
        this.bgColor = entry.bgColor;
        this.overrideUrl = entry.overrideUrl;
        this.tags = entry.tags.slice();
        this.times = entry.times.clone();
        this.fields = new Map();
        for (const [name, value] of entry.fields) {
            if (value instanceof protected_value_1.ProtectedValue) {
                this.fields.set(name, value.clone());
            }
            else {
                this.fields.set(name, value);
            }
        }
        this.binaries = new Map();
        for (const [name, value] of entry.binaries) {
            if (value instanceof protected_value_1.ProtectedValue) {
                this.binaries.set(name, value.clone());
            }
            else if (kdbx_binaries_1.KdbxBinaries.isKdbxBinaryWithHash(value)) {
                this.binaries.set(name, { hash: value.hash, value: value.value });
            }
            else {
                this.binaries.set(name, value);
            }
        }
        this.autoType = JSON.parse(JSON.stringify(entry.autoType));
    }
    merge(objectMap) {
        const remoteEntry = objectMap.remoteEntries.get(this.uuid.id);
        if (!remoteEntry) {
            return;
        }
        const remoteHistory = remoteEntry.history.slice();
        if (this.lastModTime < remoteEntry.lastModTime) {
            // remote is more new; push current state to history and update
            this.pushHistory();
            this.copyFrom(remoteEntry);
        }
        else if (this.lastModTime > remoteEntry.lastModTime) {
            // local is more new; if remote state is not in history, push it
            const existsInHistory = this.history.some((historyEntry) => {
                return historyEntry.lastModTime === remoteEntry.lastModTime;
            });
            if (!existsInHistory) {
                const historyEntry = new KdbxEntry();
                historyEntry.copyFrom(remoteEntry);
                remoteHistory.push(historyEntry);
            }
        }
        this.history = this.mergeHistory(remoteHistory, remoteEntry.lastModTime);
    }
    /**
     * Merge entry history with remote entry history
     * Tombstones are stored locally and must be immediately discarded by replica after successful upstream push.
     * It's client responsibility, to save and load tombstones for local replica, and to clear them after successful upstream push.
     *
     * Implements remove-win OR-set CRDT with local tombstones stored in _editState.
     *
     * Format doesn't allow saving tombstones for history entries, so they are stored locally.
     * Any unmodified state from past or modifications of current state synced with central upstream will be successfully merged.
     * Assumes there's only one central upstream, may produce inconsistencies while merging outdated replica outside main upstream.
     * Phantom entries and phantom deletions will appear if remote replica checked out an old state and has just added a new state.
     * If a client is using central upstream for sync, the remote replica must first sync it state and
     * only after it update the upstream, so this should never happen.
     *
     * References:
     *
     * An Optimized Conflict-free Replicated Set arXiv:1210.3368 [cs.DC]
     * http://arxiv.org/abs/1210.3368
     *
     * Gene T. J. Wuu and Arthur J. Bernstein. Efficient solutions to the replicated log and dictionary
     * problems. In Symp. on Principles of Dist. Comp. (PODC), pages 233–242, Vancouver, BC, Canada, August 1984.
     * https://pages.lip6.fr/Marc.Shapiro/papers/RR-7687.pdf
     */
    mergeHistory(remoteHistory, remoteLastModTime) {
        // we can skip sorting but the history may not have been sorted
        this.history.sort((x, y) => x.lastModTime - y.lastModTime);
        remoteHistory.sort((x, y) => x.lastModTime - y.lastModTime);
        let historyIx = 0, remoteHistoryIx = 0;
        const newHistory = [];
        while (historyIx < this.history.length || remoteHistoryIx < remoteHistory.length) {
            const historyEntry = this.history[historyIx], remoteHistoryEntry = remoteHistory[remoteHistoryIx], entryTime = historyEntry && historyEntry.lastModTime, remoteEntryTime = remoteHistoryEntry && remoteHistoryEntry.lastModTime;
            if (entryTime === remoteEntryTime) {
                // exists in local and remote
                newHistory.push(historyEntry);
                historyIx++;
                remoteHistoryIx++;
                continue;
            }
            if (!historyEntry || entryTime > remoteEntryTime) {
                // local is absent
                if (!this._editState || this._editState.deleted.indexOf(remoteEntryTime) < 0) {
                    // added remotely
                    const remoteHistoryEntryClone = new KdbxEntry();
                    remoteHistoryEntryClone.copyFrom(remoteHistoryEntry);
                    newHistory.push(remoteHistoryEntryClone);
                } // else: deleted locally
                remoteHistoryIx++;
                continue;
            }
            // (!remoteHistoryEntry || entryTime < remoteEntryTime) && historyEntry
            // remote is absent
            if (this._editState && this._editState.added.indexOf(entryTime) >= 0) {
                // added locally
                newHistory.push(historyEntry);
            }
            else if (entryTime > remoteLastModTime) {
                // outdated replica history has ended
                newHistory.push(historyEntry);
            } // else: deleted remotely
            historyIx++;
        }
        return newHistory;
    }
    static create(meta, parentGroup) {
        const entry = new KdbxEntry();
        entry.uuid = kdbx_uuid_1.KdbxUuid.random();
        entry.icon = consts_1.Icons.Key;
        entry.times = kdbx_times_1.KdbxTimes.create();
        entry.parentGroup = parentGroup;
        entry.setField('Title', '', meta.memoryProtection.title);
        entry.setField('UserName', meta.defaultUser || '', meta.memoryProtection.userName);
        entry.setField('Password', '', meta.memoryProtection.password);
        entry.setField('URL', '', meta.memoryProtection.url);
        entry.setField('Notes', '', meta.memoryProtection.notes);
        entry.autoType.enabled =
            typeof parentGroup.enableAutoType === 'boolean' ? parentGroup.enableAutoType : true;
        entry.autoType.obfuscation = consts_1.AutoTypeObfuscationOptions.None;
        return entry;
    }
    static read(xmlNode, ctx, parentGroup) {
        const entry = new KdbxEntry();
        for (let i = 0, cn = xmlNode.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            if (childNode.tagName) {
                entry.readNode(childNode, ctx);
            }
        }
        if (entry.uuid.empty) {
            // some clients don't write ids
            entry.uuid = kdbx_uuid_1.KdbxUuid.random();
            for (let j = 0; j < entry.history.length; j++) {
                entry.history[j].uuid = entry.uuid;
            }
        }
        entry.parentGroup = parentGroup;
        return entry;
    }
}
exports.KdbxEntry = KdbxEntry;


/***/ }),

/***/ "./format/kdbx-format.ts":
/*!*******************************!*\
  !*** ./format/kdbx-format.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxFormat = void 0;
const fflate_1 = __webpack_require__(/*! fflate */ "../node_modules/fflate/lib/index.cjs");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const binary_stream_1 = __webpack_require__(/*! ../utils/binary-stream */ "./utils/binary-stream.ts");
const kdbx_context_1 = __webpack_require__(/*! ./kdbx-context */ "./format/kdbx-context.ts");
const kdbx_header_1 = __webpack_require__(/*! ./kdbx-header */ "./format/kdbx-header.ts");
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
const protect_salt_generator_1 = __webpack_require__(/*! ../crypto/protect-salt-generator */ "./crypto/protect-salt-generator.ts");
const XmlUtils = __webpack_require__(/*! ../utils/xml-utils */ "./utils/xml-utils.ts");
const HmacBlockTransform = __webpack_require__(/*! ../crypto/hmac-block-transform */ "./crypto/hmac-block-transform.ts");
const HashedBlockTransform = __webpack_require__(/*! ../crypto/hashed-block-transform */ "./crypto/hashed-block-transform.ts");
const CryptoEngine = __webpack_require__(/*! ../crypto/crypto-engine */ "./crypto/crypto-engine.ts");
const KeyEncryptorAes = __webpack_require__(/*! ../crypto/key-encryptor-aes */ "./crypto/key-encryptor-aes.ts");
const KeyEncryptorKdf = __webpack_require__(/*! ../crypto/key-encryptor-kdf */ "./crypto/key-encryptor-kdf.ts");
const int64_1 = __webpack_require__(/*! ../utils/int64 */ "./utils/int64.ts");
class KdbxFormat {
    constructor(kdbx) {
        this.preserveXml = false;
        this.kdbx = kdbx;
        this.ctx = new kdbx_context_1.KdbxContext({ kdbx });
    }
    load(data) {
        const stm = new binary_stream_1.BinaryStream(data);
        return this.kdbx.credentials.ready.then(() => {
            this.kdbx.header = kdbx_header_1.KdbxHeader.read(stm, this.ctx);
            if (this.kdbx.header.versionMajor === 3) {
                return this.loadV3(stm);
            }
            else if (this.kdbx.header.versionMajor === 4) {
                return this.loadV4(stm);
            }
            else {
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidVersion, `bad version: ${this.kdbx.versionMajor}`);
            }
        });
    }
    loadV3(stm) {
        return this.decryptXmlV3(stm).then((xmlStr) => {
            this.kdbx.xml = XmlUtils.parse(xmlStr);
            return this.setProtectedValues().then(() => {
                return this.kdbx.loadFromXml(this.ctx).then(() => {
                    return this.checkHeaderHashV3(stm).then(() => {
                        this.cleanXml();
                        return this.kdbx;
                    });
                });
            });
        });
    }
    loadV4(stm) {
        return this.getHeaderHash(stm).then((headerSha) => {
            const expectedHeaderSha = stm.readBytes(headerSha.byteLength);
            if (!(0, byte_utils_1.arrayBufferEquals)(expectedHeaderSha, headerSha)) {
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'header hash mismatch');
            }
            return this.computeKeysV4().then((keys) => {
                return this.getHeaderHmac(stm, keys.hmacKey).then((headerHmac) => {
                    const expectedHeaderHmac = stm.readBytes(headerHmac.byteLength);
                    if (!(0, byte_utils_1.arrayBufferEquals)(expectedHeaderHmac, headerHmac)) {
                        throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidKey);
                    }
                    return HmacBlockTransform.decrypt(stm.readBytesToEnd(), keys.hmacKey).then((data) => {
                        (0, byte_utils_1.zeroBuffer)(keys.hmacKey);
                        return this.decryptData(data, keys.cipherKey).then((data) => {
                            (0, byte_utils_1.zeroBuffer)(keys.cipherKey);
                            if (this.kdbx.header.compression === consts_1.CompressionAlgorithm.GZip) {
                                data = (0, byte_utils_1.arrayToBuffer)((0, fflate_1.gunzipSync)(new Uint8Array(data)));
                            }
                            stm = new binary_stream_1.BinaryStream((0, byte_utils_1.arrayToBuffer)(data));
                            this.kdbx.header.readInnerHeader(stm, this.ctx);
                            data = stm.readBytesToEnd();
                            const xmlStr = (0, byte_utils_1.bytesToString)(data);
                            this.kdbx.xml = XmlUtils.parse(xmlStr);
                            return this.setProtectedValues().then(() => {
                                return this.kdbx.loadFromXml(this.ctx).then((kdbx) => {
                                    this.cleanXml();
                                    return kdbx;
                                });
                            });
                        });
                    });
                });
            });
        });
    }
    loadXml(xmlStr) {
        return this.kdbx.credentials.ready.then(() => {
            this.kdbx.header = kdbx_header_1.KdbxHeader.create();
            this.kdbx.xml = XmlUtils.parse(xmlStr);
            XmlUtils.protectPlainValues(this.kdbx.xml.documentElement);
            return this.kdbx.loadFromXml(this.ctx).then(() => {
                this.cleanXml();
                return this.kdbx;
            });
        });
    }
    save() {
        return this.kdbx.credentials.ready.then(() => {
            const stm = new binary_stream_1.BinaryStream();
            this.kdbx.header.generateSalts();
            this.kdbx.header.write(stm);
            if (this.kdbx.versionMajor === 3) {
                return this.saveV3(stm);
            }
            else if (this.kdbx.versionMajor === 4) {
                return this.saveV4(stm);
            }
            else {
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidVersion, `bad version: ${this.kdbx.versionMajor}`);
            }
        });
    }
    saveV3(stm) {
        return this.getHeaderHash(stm).then((headerHash) => {
            this.kdbx.meta.headerHash = headerHash;
            this.kdbx.buildXml(this.ctx);
            return this.getProtectSaltGenerator().then((gen) => {
                if (!this.kdbx.xml) {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'no xml');
                }
                XmlUtils.updateProtectedValuesSalt(this.kdbx.xml.documentElement, gen);
                return this.encryptXmlV3().then((data) => {
                    this.cleanXml();
                    stm.writeBytes(data);
                    return stm.getWrittenBytes();
                });
            });
        });
    }
    saveV4(stm) {
        this.kdbx.buildXml(this.ctx);
        return this.getHeaderHash(stm).then((headerSha) => {
            stm.writeBytes(headerSha);
            return this.computeKeysV4().then((keys) => {
                return this.getHeaderHmac(stm, keys.hmacKey).then((headerHmac) => {
                    stm.writeBytes(headerHmac);
                    return this.getProtectSaltGenerator().then((gen) => {
                        if (!this.kdbx.xml) {
                            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'no xml');
                        }
                        XmlUtils.updateProtectedValuesSalt(this.kdbx.xml.documentElement, gen);
                        const xml = XmlUtils.serialize(this.kdbx.xml);
                        const innerHeaderStm = new binary_stream_1.BinaryStream();
                        this.kdbx.header.writeInnerHeader(innerHeaderStm, this.ctx);
                        const innerHeaderData = innerHeaderStm.getWrittenBytes();
                        const xmlData = (0, byte_utils_1.arrayToBuffer)((0, byte_utils_1.stringToBytes)(xml));
                        let data = new ArrayBuffer(innerHeaderData.byteLength + xmlData.byteLength);
                        const dataArr = new Uint8Array(data);
                        dataArr.set(new Uint8Array(innerHeaderData));
                        dataArr.set(new Uint8Array(xmlData), innerHeaderData.byteLength);
                        (0, byte_utils_1.zeroBuffer)(xmlData);
                        (0, byte_utils_1.zeroBuffer)(innerHeaderData);
                        if (this.kdbx.header.compression === consts_1.CompressionAlgorithm.GZip) {
                            data = (0, byte_utils_1.arrayToBuffer)((0, fflate_1.gzipSync)(new Uint8Array(data)));
                        }
                        return this.encryptData((0, byte_utils_1.arrayToBuffer)(data), keys.cipherKey).then((data) => {
                            (0, byte_utils_1.zeroBuffer)(keys.cipherKey);
                            return HmacBlockTransform.encrypt(data, keys.hmacKey).then((data) => {
                                this.cleanXml();
                                (0, byte_utils_1.zeroBuffer)(keys.hmacKey);
                                stm.writeBytes(data);
                                return stm.getWrittenBytes();
                            });
                        });
                    });
                });
            });
        });
    }
    saveXml(prettyPrint = false) {
        return this.kdbx.credentials.ready.then(() => {
            this.kdbx.header.generateSalts();
            this.ctx.exportXml = true;
            this.kdbx.buildXml(this.ctx);
            if (!this.kdbx.xml) {
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'no xml');
            }
            XmlUtils.unprotectValues(this.kdbx.xml.documentElement);
            const xml = XmlUtils.serialize(this.kdbx.xml, prettyPrint);
            XmlUtils.protectUnprotectedValues(this.kdbx.xml.documentElement);
            this.cleanXml();
            return xml;
        });
    }
    decryptXmlV3(stm) {
        const data = stm.readBytesToEnd();
        return this.getMasterKeyV3().then((masterKey) => {
            return this.decryptData(data, masterKey).then((data) => {
                (0, byte_utils_1.zeroBuffer)(masterKey);
                data = this.trimStartBytesV3(data);
                return HashedBlockTransform.decrypt(data).then((data) => {
                    if (this.kdbx.header.compression === consts_1.CompressionAlgorithm.GZip) {
                        data = (0, byte_utils_1.arrayToBuffer)((0, fflate_1.gunzipSync)(new Uint8Array(data)));
                    }
                    return (0, byte_utils_1.bytesToString)(data);
                });
            });
        });
    }
    encryptXmlV3() {
        if (!this.kdbx.xml) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'no xml');
        }
        const xml = XmlUtils.serialize(this.kdbx.xml);
        let data = (0, byte_utils_1.arrayToBuffer)((0, byte_utils_1.stringToBytes)(xml));
        if (this.kdbx.header.compression === consts_1.CompressionAlgorithm.GZip) {
            data = (0, byte_utils_1.arrayToBuffer)((0, fflate_1.gzipSync)(new Uint8Array(data)));
        }
        return HashedBlockTransform.encrypt((0, byte_utils_1.arrayToBuffer)(data)).then((data) => {
            if (!this.kdbx.header.streamStartBytes) {
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'no header start bytes');
            }
            const ssb = new Uint8Array(this.kdbx.header.streamStartBytes);
            const newData = new Uint8Array(data.byteLength + ssb.length);
            newData.set(ssb);
            newData.set(new Uint8Array(data), ssb.length);
            data = newData;
            return this.getMasterKeyV3().then((masterKey) => {
                return this.encryptData((0, byte_utils_1.arrayToBuffer)(data), masterKey).then((data) => {
                    (0, byte_utils_1.zeroBuffer)(masterKey);
                    return data;
                });
            });
        });
    }
    getMasterKeyV3() {
        return this.kdbx.credentials.getHash().then((credHash) => {
            if (!this.kdbx.header.transformSeed ||
                !this.kdbx.header.keyEncryptionRounds ||
                !this.kdbx.header.masterSeed) {
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no header transform parameters');
            }
            const transformSeed = this.kdbx.header.transformSeed;
            const transformRounds = this.kdbx.header.keyEncryptionRounds;
            const masterSeed = this.kdbx.header.masterSeed;
            return this.kdbx.credentials.getChallengeResponse(masterSeed).then((chalResp) => {
                return KeyEncryptorAes.encrypt(new Uint8Array(credHash), transformSeed, transformRounds).then((encKey) => {
                    (0, byte_utils_1.zeroBuffer)(credHash);
                    return CryptoEngine.sha256(encKey).then((keyHash) => {
                        (0, byte_utils_1.zeroBuffer)(encKey);
                        const chalRespLength = chalResp ? chalResp.byteLength : 0;
                        const all = new Uint8Array(masterSeed.byteLength + keyHash.byteLength + chalRespLength);
                        all.set(new Uint8Array(masterSeed), 0);
                        if (chalResp) {
                            all.set(new Uint8Array(chalResp), masterSeed.byteLength);
                        }
                        all.set(new Uint8Array(keyHash), masterSeed.byteLength + chalRespLength);
                        (0, byte_utils_1.zeroBuffer)(keyHash);
                        (0, byte_utils_1.zeroBuffer)(masterSeed);
                        if (chalResp) {
                            (0, byte_utils_1.zeroBuffer)(chalResp);
                        }
                        return CryptoEngine.sha256(all.buffer).then((masterKey) => {
                            (0, byte_utils_1.zeroBuffer)(all.buffer);
                            return masterKey;
                        });
                    });
                });
            });
        });
    }
    trimStartBytesV3(data) {
        if (!this.kdbx.header.streamStartBytes) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no stream start bytes');
        }
        const ssb = this.kdbx.header.streamStartBytes;
        if (data.byteLength < ssb.byteLength) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'short start bytes');
        }
        if (!(0, byte_utils_1.arrayBufferEquals)(data.slice(0, this.kdbx.header.streamStartBytes.byteLength), ssb)) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidKey);
        }
        return data.slice(ssb.byteLength);
    }
    setProtectedValues() {
        return this.getProtectSaltGenerator().then((gen) => {
            if (!this.kdbx.xml) {
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'no xml');
            }
            XmlUtils.setProtectedValues(this.kdbx.xml.documentElement, gen);
        });
    }
    getProtectSaltGenerator() {
        if (!this.kdbx.header.protectedStreamKey || !this.kdbx.header.crsAlgorithm) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'bad header parameters');
        }
        return protect_salt_generator_1.ProtectSaltGenerator.create(this.kdbx.header.protectedStreamKey, this.kdbx.header.crsAlgorithm);
    }
    getHeaderHash(stm) {
        if (!this.kdbx.header.endPos) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'no end pos');
        }
        const src = stm.readBytesNoAdvance(0, this.kdbx.header.endPos);
        return CryptoEngine.sha256(src);
    }
    getHeaderHmac(stm, key) {
        if (!this.kdbx.header.endPos) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'no end pos');
        }
        const src = stm.readBytesNoAdvance(0, this.kdbx.header.endPos);
        return HmacBlockTransform.getHmacKey(key, new int64_1.Int64(0xffffffff, 0xffffffff)).then((keySha) => {
            return CryptoEngine.hmacSha256(keySha, src);
        });
    }
    checkHeaderHashV3(stm) {
        if (this.kdbx.meta.headerHash) {
            const metaHash = this.kdbx.meta.headerHash;
            return this.getHeaderHash(stm).then((actualHash) => {
                if (!(0, byte_utils_1.arrayBufferEquals)(metaHash, actualHash)) {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'header hash mismatch');
                }
            });
        }
        else {
            return Promise.resolve();
        }
    }
    computeKeysV4() {
        const masterSeed = this.kdbx.header.masterSeed;
        if (!masterSeed || masterSeed.byteLength !== 32) {
            return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad master seed'));
        }
        const kdfParams = this.kdbx.header.kdfParameters;
        if (!kdfParams) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no kdf params');
        }
        const kdfSalt = kdfParams.get('S');
        if (!(kdfSalt instanceof ArrayBuffer)) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no salt');
        }
        return this.kdbx.credentials.getHash(kdfSalt).then((credHash) => {
            return KeyEncryptorKdf.encrypt(credHash, kdfParams).then((encKey) => {
                (0, byte_utils_1.zeroBuffer)(credHash);
                if (!encKey || encKey.byteLength !== 32) {
                    return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.Unsupported, 'bad derived key'));
                }
                const keyWithSeed = new Uint8Array(65);
                keyWithSeed.set(new Uint8Array(masterSeed), 0);
                keyWithSeed.set(new Uint8Array(encKey), masterSeed.byteLength);
                keyWithSeed[64] = 1;
                (0, byte_utils_1.zeroBuffer)(encKey);
                (0, byte_utils_1.zeroBuffer)(masterSeed);
                return Promise.all([
                    CryptoEngine.sha256(keyWithSeed.buffer.slice(0, 64)),
                    CryptoEngine.sha512(keyWithSeed.buffer)
                ]).then((keys) => {
                    (0, byte_utils_1.zeroBuffer)(keyWithSeed);
                    return { cipherKey: keys[0], hmacKey: keys[1] };
                });
            });
        });
    }
    decryptData(data, cipherKey) {
        const cipherId = this.kdbx.header.dataCipherUuid;
        if (!cipherId) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no cipher id');
        }
        switch (cipherId.toString()) {
            case consts_1.CipherId.Aes:
                return this.transformDataV4Aes(data, cipherKey, false);
            case consts_1.CipherId.ChaCha20:
                return this.transformDataV4ChaCha20(data, cipherKey);
            default:
                return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.Unsupported, 'unsupported cipher'));
        }
    }
    encryptData(data, cipherKey) {
        const cipherId = this.kdbx.header.dataCipherUuid;
        if (!cipherId) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no cipher id');
        }
        switch (cipherId.toString()) {
            case consts_1.CipherId.Aes:
                return this.transformDataV4Aes(data, cipherKey, true);
            case consts_1.CipherId.ChaCha20:
                return this.transformDataV4ChaCha20(data, cipherKey);
            default:
                return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.Unsupported, 'unsupported cipher'));
        }
    }
    transformDataV4Aes(data, cipherKey, encrypt) {
        const aesCbc = CryptoEngine.createAesCbc();
        const iv = this.kdbx.header.encryptionIV;
        if (!iv) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no encryption IV');
        }
        return aesCbc.importKey(cipherKey).then(() => {
            return encrypt ? aesCbc.encrypt(data, iv) : aesCbc.decrypt(data, iv);
        });
    }
    transformDataV4ChaCha20(data, cipherKey) {
        const iv = this.kdbx.header.encryptionIV;
        if (!iv) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no encryption IV');
        }
        return CryptoEngine.chacha20(data, cipherKey, iv);
    }
    cleanXml() {
        if (!this.preserveXml) {
            this.kdbx.xml = undefined;
        }
    }
}
exports.KdbxFormat = KdbxFormat;


/***/ }),

/***/ "./format/kdbx-group.ts":
/*!******************************!*\
  !*** ./format/kdbx-group.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxGroup = void 0;
const XmlNames = __webpack_require__(/*! ./../defs/xml-names */ "./defs/xml-names.ts");
const XmlUtils = __webpack_require__(/*! ./../utils/xml-utils */ "./utils/xml-utils.ts");
const kdbx_times_1 = __webpack_require__(/*! ./kdbx-times */ "./format/kdbx-times.ts");
const kdbx_uuid_1 = __webpack_require__(/*! ./kdbx-uuid */ "./format/kdbx-uuid.ts");
const kdbx_entry_1 = __webpack_require__(/*! ./kdbx-entry */ "./format/kdbx-entry.ts");
const kdbx_custom_data_1 = __webpack_require__(/*! ./kdbx-custom-data */ "./format/kdbx-custom-data.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
class KdbxGroup {
    constructor() {
        this.uuid = new kdbx_uuid_1.KdbxUuid();
        this.tags = [];
        this.times = new kdbx_times_1.KdbxTimes();
        this.groups = [];
        this.entries = [];
    }
    get lastModTime() {
        var _a, _b;
        return (_b = (_a = this.times.lastModTime) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : 0;
    }
    get locationChanged() {
        var _a, _b;
        return (_b = (_a = this.times.locationChanged) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : 0;
    }
    readNode(node, ctx) {
        var _a, _b;
        switch (node.tagName) {
            case XmlNames.Elem.Uuid:
                this.uuid = (_a = XmlUtils.getUuid(node)) !== null && _a !== void 0 ? _a : new kdbx_uuid_1.KdbxUuid();
                break;
            case XmlNames.Elem.Name:
                this.name = XmlUtils.getText(node);
                break;
            case XmlNames.Elem.Notes:
                this.notes = XmlUtils.getText(node);
                break;
            case XmlNames.Elem.Icon:
                this.icon = XmlUtils.getNumber(node);
                break;
            case XmlNames.Elem.CustomIconID:
                this.customIcon = XmlUtils.getUuid(node);
                break;
            case XmlNames.Elem.Tags:
                this.tags = XmlUtils.getTags(node);
                break;
            case XmlNames.Elem.Times:
                this.times = kdbx_times_1.KdbxTimes.read(node);
                break;
            case XmlNames.Elem.IsExpanded:
                this.expanded = (_b = XmlUtils.getBoolean(node)) !== null && _b !== void 0 ? _b : undefined;
                break;
            case XmlNames.Elem.GroupDefaultAutoTypeSeq:
                this.defaultAutoTypeSeq = XmlUtils.getText(node);
                break;
            case XmlNames.Elem.EnableAutoType:
                this.enableAutoType = XmlUtils.getBoolean(node);
                break;
            case XmlNames.Elem.EnableSearching:
                this.enableSearching = XmlUtils.getBoolean(node);
                break;
            case XmlNames.Elem.LastTopVisibleEntry:
                this.lastTopVisibleEntry = XmlUtils.getUuid(node);
                break;
            case XmlNames.Elem.Group:
                this.groups.push(KdbxGroup.read(node, ctx, this));
                break;
            case XmlNames.Elem.Entry:
                this.entries.push(kdbx_entry_1.KdbxEntry.read(node, ctx, this));
                break;
            case XmlNames.Elem.CustomData:
                this.customData = kdbx_custom_data_1.KdbxCustomData.read(node);
                break;
            case XmlNames.Elem.PreviousParentGroup:
                this.previousParentGroup = XmlUtils.getUuid(node);
                break;
        }
    }
    write(parentNode, ctx) {
        const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.Group);
        XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.Uuid), this.uuid);
        XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.Name), this.name);
        XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.Notes), this.notes);
        XmlUtils.setNumber(XmlUtils.addChildNode(node, XmlNames.Elem.Icon), this.icon);
        if (this.tags.length && ctx.kdbx.versionIsAtLeast(4, 1)) {
            XmlUtils.setTags(XmlUtils.addChildNode(node, XmlNames.Elem.Tags), this.tags);
        }
        if (this.customIcon) {
            XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.CustomIconID), this.customIcon);
        }
        if (this.previousParentGroup !== undefined && ctx.kdbx.versionIsAtLeast(4, 1)) {
            XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.PreviousParentGroup), this.previousParentGroup);
        }
        if (this.customData) {
            kdbx_custom_data_1.KdbxCustomData.write(node, ctx, this.customData);
        }
        this.times.write(node, ctx);
        XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.IsExpanded), this.expanded);
        XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.GroupDefaultAutoTypeSeq), this.defaultAutoTypeSeq);
        XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.EnableAutoType), this.enableAutoType);
        XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.EnableSearching), this.enableSearching);
        XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.LastTopVisibleEntry), this.lastTopVisibleEntry);
        for (const group of this.groups) {
            group.write(node, ctx);
        }
        for (const entry of this.entries) {
            entry.write(node, ctx);
        }
    }
    *allGroups() {
        yield this;
        for (const group of this.groups) {
            for (const g of group.allGroups()) {
                yield g;
            }
        }
    }
    *allEntries() {
        for (const group of this.allGroups()) {
            for (const entry of group.entries) {
                yield entry;
            }
        }
    }
    *allGroupsAndEntries() {
        yield this;
        for (const entry of this.entries) {
            yield entry;
        }
        for (const group of this.groups) {
            for (const item of group.allGroupsAndEntries()) {
                yield item;
            }
        }
    }
    merge(objectMap) {
        const remoteGroup = objectMap.remoteGroups.get(this.uuid.id);
        if (!remoteGroup) {
            return;
        }
        if (remoteGroup.lastModTime > this.lastModTime) {
            this.copyFrom(remoteGroup);
        }
        this.groups = this.mergeCollection(this.groups, remoteGroup.groups, objectMap.groups, objectMap.remoteGroups, objectMap.deleted);
        this.entries = this.mergeCollection(this.entries, remoteGroup.entries, objectMap.entries, objectMap.remoteEntries, objectMap.deleted);
        for (const group of this.groups) {
            group.merge(objectMap);
        }
        for (const entry of this.entries) {
            entry.merge(objectMap);
        }
    }
    /**
     * Merge object collection with remote collection
     * Implements 2P-set CRDT with tombstones stored in objectMap.deleted
     * Assumes tombstones are already merged
     */
    mergeCollection(collection, remoteCollection, objectMapItems, remoteObjectMapItems, deletedObjects) {
        const newItems = [];
        for (const item of collection) {
            if (!item.uuid || deletedObjects.has(item.uuid.id)) {
                continue; // item deleted
            }
            const remoteItem = remoteObjectMapItems.get(item.uuid.id);
            if (!remoteItem) {
                newItems.push(item); // item added locally
            }
            else if (remoteItem.locationChanged <= item.locationChanged) {
                newItems.push(item); // item not changed or moved to this group locally later than remote
            }
        }
        let ix = -1;
        for (const remoteItem of remoteCollection) {
            ix++;
            if (!remoteItem.uuid || deletedObjects.has(remoteItem.uuid.id)) {
                continue; // item already processed as local item or deleted
            }
            const item = objectMapItems.get(remoteItem.uuid.id);
            if (item && remoteItem.locationChanged > item.locationChanged) {
                item.parentGroup = this; // item moved to this group remotely later than local
                newItems.splice(KdbxGroup.findInsertIx(newItems, remoteCollection, ix), 0, item);
            }
            else if (!item) {
                // item created remotely
                let newItem;
                if (remoteItem instanceof KdbxGroup) {
                    const group = new KdbxGroup();
                    group.copyFrom(remoteItem);
                    newItem = group;
                }
                else if (remoteItem instanceof kdbx_entry_1.KdbxEntry) {
                    const entry = new kdbx_entry_1.KdbxEntry();
                    entry.copyFrom(remoteItem);
                    newItem = entry;
                }
                else {
                    continue;
                }
                newItem.parentGroup = this;
                newItems.splice(KdbxGroup.findInsertIx(newItems, remoteCollection, ix), 0, newItem);
            }
        }
        return newItems;
    }
    /**
     * Finds a best place to insert new item into collection
     */
    static findInsertIx(dst, src, srcIx) {
        let selectedIx = dst.length, selectedScore = -1;
        for (let dstIx = 0; dstIx <= dst.length; dstIx++) {
            let score = 0;
            const srcPrev = srcIx > 0 ? src[srcIx - 1].uuid.id : undefined, srcNext = srcIx + 1 < src.length ? src[srcIx + 1].uuid.id : undefined, dstPrev = dstIx > 0 ? dst[dstIx - 1].uuid.id : undefined, dstNext = dstIx < dst.length ? dst[dstIx].uuid.id : undefined;
            if (!srcPrev && !dstPrev) {
                score += 1; // start of sequence
            }
            else if (srcPrev === dstPrev) {
                score += 5; // previous element equals
            }
            if (!srcNext && !dstNext) {
                score += 2; // end of sequence
            }
            else if (srcNext === dstNext) {
                score += 5; // next element equals
            }
            if (score > selectedScore) {
                selectedIx = dstIx;
                selectedScore = score;
            }
        }
        return selectedIx;
    }
    copyFrom(group) {
        this.uuid = group.uuid;
        this.name = group.name;
        this.notes = group.notes;
        this.icon = group.icon;
        this.customIcon = group.customIcon;
        this.times = group.times.clone();
        this.expanded = group.expanded;
        this.defaultAutoTypeSeq = group.defaultAutoTypeSeq;
        this.enableAutoType = group.enableAutoType;
        this.enableSearching = group.enableSearching;
        this.lastTopVisibleEntry = group.lastTopVisibleEntry;
    }
    static create(name, parentGroup) {
        const group = new KdbxGroup();
        group.uuid = kdbx_uuid_1.KdbxUuid.random();
        group.icon = consts_1.Icons.Folder;
        group.times = kdbx_times_1.KdbxTimes.create();
        group.name = name;
        group.parentGroup = parentGroup;
        group.expanded = true;
        group.enableAutoType = null;
        group.enableSearching = null;
        group.lastTopVisibleEntry = new kdbx_uuid_1.KdbxUuid();
        return group;
    }
    static read(xmlNode, ctx, parentGroup) {
        const grp = new KdbxGroup();
        for (let i = 0, cn = xmlNode.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            if (childNode.tagName) {
                grp.readNode(childNode, ctx);
            }
        }
        if (grp.uuid.empty) {
            // some clients don't write ids
            grp.uuid = kdbx_uuid_1.KdbxUuid.random();
        }
        grp.parentGroup = parentGroup;
        return grp;
    }
}
exports.KdbxGroup = KdbxGroup;


/***/ }),

/***/ "./format/kdbx-header.ts":
/*!*******************************!*\
  !*** ./format/kdbx-header.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/* Docs for the KDBX header schema:
 * https://keepass.info/help/kb/kdbx_4.html#innerhdr
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxHeader = void 0;
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const kdbx_uuid_1 = __webpack_require__(/*! ./kdbx-uuid */ "./format/kdbx-uuid.ts");
const var_dictionary_1 = __webpack_require__(/*! ../utils/var-dictionary */ "./utils/var-dictionary.ts");
const binary_stream_1 = __webpack_require__(/*! ../utils/binary-stream */ "./utils/binary-stream.ts");
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
const CryptoEngine = __webpack_require__(/*! ../crypto/crypto-engine */ "./crypto/crypto-engine.ts");
const int64_1 = __webpack_require__(/*! ../utils/int64 */ "./utils/int64.ts");
const protected_value_1 = __webpack_require__(/*! ../crypto/protected-value */ "./crypto/protected-value.ts");
const HeaderFields = [
    { name: 'EndOfHeader' },
    { name: 'Comment' },
    { name: 'CipherID' },
    { name: 'CompressionFlags' },
    { name: 'MasterSeed' },
    { name: 'TransformSeed', ver: [3] },
    { name: 'TransformRounds', ver: [3] },
    { name: 'EncryptionIV' },
    { name: 'ProtectedStreamKey', ver: [3] },
    { name: 'StreamStartBytes', ver: [3] },
    { name: 'InnerRandomStreamID', ver: [3] },
    { name: 'KdfParameters', ver: [4] },
    { name: 'PublicCustomData', ver: [4] }
];
const InnerHeaderFields = [
    { name: 'EndOfHeader' },
    { name: 'InnerRandomStreamID' },
    { name: 'InnerRandomStreamKey' },
    { name: 'Binary', skipHeader: true }
];
const HeaderConst = {
    DefaultFileVersionMajor: 4,
    MinSupportedVersion: 3,
    MaxSupportedVersion: 4,
    FlagBinaryProtected: 0x01,
    InnerHeaderBinaryFieldId: 0x03,
    DefaultKdfAlgo: consts_1.KdfId.Argon2d,
    DefaultKdfSaltLength: 32,
    DefaultKdfParallelism: 1,
    DefaultKdfIterations: 2,
    DefaultKdfMemory: 1024 * 1024,
    DefaultKdfVersion: 0x13,
    EndOfHeader: 0x0d0ad0a
};
const DefaultMinorVersions = {
    3: 1,
    4: 0
};
const LastMinorVersions = {
    3: 1,
    4: 1
};
class KdbxHeader {
    constructor() {
        this.versionMajor = 0;
        this.versionMinor = 0;
    }
    readSignature(stm) {
        if (stm.byteLength < 8) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'not enough data');
        }
        const sig1 = stm.getUint32(true), sig2 = stm.getUint32(true);
        if (!(sig1 === consts_1.Signatures.FileMagic && sig2 === consts_1.Signatures.Sig2Kdbx)) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.BadSignature);
        }
    }
    writeSignature(stm) {
        stm.setUint32(consts_1.Signatures.FileMagic, true);
        stm.setUint32(consts_1.Signatures.Sig2Kdbx, true);
    }
    readVersion(stm) {
        const versionMinor = stm.getUint16(true);
        const versionMajor = stm.getUint16(true);
        if (versionMajor > HeaderConst.MaxSupportedVersion ||
            versionMajor < HeaderConst.MinSupportedVersion) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidVersion);
        }
        if (versionMinor > LastMinorVersions[versionMajor]) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidVersion);
        }
        this.versionMinor = versionMinor;
        this.versionMajor = versionMajor;
    }
    writeVersion(stm) {
        if (!this.versionMajor) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'version is not set');
        }
        stm.setUint16(this.versionMinor, true);
        stm.setUint16(this.versionMajor, true);
    }
    readCipherID(bytes) {
        if (bytes.byteLength !== 16) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.Unsupported, 'cipher');
        }
        this.dataCipherUuid = new kdbx_uuid_1.KdbxUuid(bytes);
    }
    writeCipherID(stm) {
        if (!this.dataCipherUuid) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'cipher id is not set');
        }
        this.writeFieldSize(stm, 16);
        stm.writeBytes(this.dataCipherUuid.bytes);
    }
    readCompressionFlags(bytes) {
        const id = new DataView(bytes).getUint32(0, true);
        if (id < 0 || id >= Object.keys(consts_1.CompressionAlgorithm).length) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.Unsupported, 'compression');
        }
        this.compression = id;
    }
    writeCompressionFlags(stm) {
        if (typeof this.compression !== 'number') {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'compression is not set');
        }
        this.writeFieldSize(stm, 4);
        stm.setUint32(this.compression, true);
    }
    readMasterSeed(bytes) {
        this.masterSeed = bytes;
    }
    writeMasterSeed(stm) {
        if (!this.masterSeed) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'master seed is not set');
        }
        this.writeFieldBytes(stm, this.masterSeed);
    }
    readTransformSeed(bytes) {
        this.transformSeed = bytes;
    }
    writeTransformSeed(stm) {
        if (!this.transformSeed) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'transform seed is not set');
        }
        this.writeFieldBytes(stm, this.transformSeed);
    }
    readTransformRounds(bytes) {
        this.keyEncryptionRounds = new binary_stream_1.BinaryStream(bytes).getUint64(true);
    }
    writeTransformRounds(stm) {
        if (!this.keyEncryptionRounds) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'key encryption rounds is not set');
        }
        this.writeFieldSize(stm, 8);
        stm.setUint64(this.keyEncryptionRounds, true);
    }
    readEncryptionIV(bytes) {
        this.encryptionIV = bytes;
    }
    writeEncryptionIV(stm) {
        if (!this.encryptionIV) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'encryption IV is not set');
        }
        this.writeFieldBytes(stm, this.encryptionIV);
    }
    readProtectedStreamKey(bytes) {
        this.protectedStreamKey = bytes;
    }
    writeProtectedStreamKey(stm) {
        if (!this.protectedStreamKey) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'protected stream key is not set');
        }
        this.writeFieldBytes(stm, this.protectedStreamKey);
    }
    readStreamStartBytes(bytes) {
        this.streamStartBytes = bytes;
    }
    writeStreamStartBytes(stm) {
        if (!this.streamStartBytes) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'stream start bytes is not set');
        }
        this.writeFieldBytes(stm, this.streamStartBytes);
    }
    readInnerRandomStreamID(bytes) {
        this.crsAlgorithm = new DataView(bytes).getUint32(0, true);
    }
    writeInnerRandomStreamID(stm) {
        if (!this.crsAlgorithm) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'CRSAlgorithm is not set');
        }
        this.writeFieldSize(stm, 4);
        stm.setUint32(this.crsAlgorithm, true);
    }
    readInnerRandomStreamKey(bytes) {
        this.protectedStreamKey = bytes;
    }
    writeInnerRandomStreamKey(stm) {
        if (!this.protectedStreamKey) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'protected stream key is not set');
        }
        this.writeFieldBytes(stm, this.protectedStreamKey);
    }
    readKdfParameters(bytes) {
        this.kdfParameters = var_dictionary_1.VarDictionary.read(new binary_stream_1.BinaryStream(bytes));
    }
    writeKdfParameters(stm) {
        if (!this.kdfParameters) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'KDF parameters are not set');
        }
        const innerStream = new binary_stream_1.BinaryStream();
        this.kdfParameters.write(innerStream);
        this.writeFieldBytes(stm, innerStream.getWrittenBytes());
    }
    readPublicCustomData(bytes) {
        this.publicCustomData = var_dictionary_1.VarDictionary.read(new binary_stream_1.BinaryStream(bytes));
    }
    hasPublicCustomData() {
        return !!this.publicCustomData;
    }
    writePublicCustomData(stm) {
        if (this.publicCustomData) {
            const innerStream = new binary_stream_1.BinaryStream();
            this.publicCustomData.write(innerStream);
            this.writeFieldBytes(stm, innerStream.getWrittenBytes());
        }
    }
    readBinary(bytes, ctx) {
        const view = new DataView(bytes);
        const flags = view.getUint8(0);
        const isProtected = flags & HeaderConst.FlagBinaryProtected;
        const binaryData = bytes.slice(1); // Actual data comes after the flag byte
        const binary = isProtected ? protected_value_1.ProtectedValue.fromBinary(binaryData) : binaryData;
        ctx.kdbx.binaries.addWithNextId(binary);
    }
    writeBinary(stm, ctx) {
        if (this.versionMajor < 4) {
            return;
        }
        const binaries = ctx.kdbx.binaries.getAll();
        for (const binary of binaries) {
            stm.setUint8(HeaderConst.InnerHeaderBinaryFieldId);
            if (binary.value instanceof protected_value_1.ProtectedValue) {
                const binaryData = binary.value.getBinary();
                this.writeFieldSize(stm, binaryData.byteLength + 1);
                stm.setUint8(HeaderConst.FlagBinaryProtected);
                stm.writeBytes(binaryData);
                (0, byte_utils_1.zeroBuffer)(binaryData);
            }
            else {
                this.writeFieldSize(stm, binary.value.byteLength + 1);
                stm.setUint8(0);
                stm.writeBytes(binary.value);
            }
        }
    }
    writeEndOfHeader(stm) {
        this.writeFieldSize(stm, 4);
        stm.setUint32(HeaderConst.EndOfHeader, false);
    }
    readField(stm, fields, ctx) {
        const headerId = stm.getUint8();
        const size = this.readFieldSize(stm);
        const bytes = size > 0 ? stm.readBytes(size) : new ArrayBuffer(0);
        const headerField = fields[headerId];
        switch (headerField.name) {
            case 'EndOfHeader':
            case 'Comment':
                break;
            case 'CipherID':
                this.readCipherID(bytes);
                break;
            case 'CompressionFlags':
                this.readCompressionFlags(bytes);
                break;
            case 'MasterSeed':
                this.readMasterSeed(bytes);
                break;
            case 'TransformSeed':
                this.readTransformSeed(bytes);
                break;
            case 'TransformRounds':
                this.readTransformRounds(bytes);
                break;
            case 'EncryptionIV':
                this.readEncryptionIV(bytes);
                break;
            case 'ProtectedStreamKey':
                this.readProtectedStreamKey(bytes);
                break;
            case 'StreamStartBytes':
                this.readStreamStartBytes(bytes);
                break;
            case 'InnerRandomStreamID':
                this.readInnerRandomStreamID(bytes);
                break;
            case 'KdfParameters':
                this.readKdfParameters(bytes);
                break;
            case 'PublicCustomData':
                this.readPublicCustomData(bytes);
                break;
            case 'InnerRandomStreamKey':
                this.readInnerRandomStreamKey(bytes);
                break;
            case 'Binary':
                this.readBinary(bytes, ctx);
                break;
            default:
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, `bad header field: ${headerField.name}`);
        }
        return headerId !== 0;
    }
    writeField(stm, headerId, fields, ctx) {
        const headerField = fields[headerId];
        if (headerField) {
            if (headerField.ver && !headerField.ver.includes(this.versionMajor)) {
                return;
            }
            switch (headerField.name) {
                case 'PublicCustomData':
                    if (!this.hasPublicCustomData()) {
                        return;
                    }
                    break;
                case 'Comment':
                    return;
            }
            if (!headerField.skipHeader) {
                stm.setUint8(headerId);
            }
            switch (headerField.name) {
                case 'EndOfHeader':
                    this.writeEndOfHeader(stm);
                    break;
                case 'CipherID':
                    this.writeCipherID(stm);
                    break;
                case 'CompressionFlags':
                    this.writeCompressionFlags(stm);
                    break;
                case 'MasterSeed':
                    this.writeMasterSeed(stm);
                    break;
                case 'TransformSeed':
                    this.writeTransformSeed(stm);
                    break;
                case 'TransformRounds':
                    this.writeTransformRounds(stm);
                    break;
                case 'EncryptionIV':
                    this.writeEncryptionIV(stm);
                    break;
                case 'ProtectedStreamKey':
                    this.writeProtectedStreamKey(stm);
                    break;
                case 'StreamStartBytes':
                    this.writeStreamStartBytes(stm);
                    break;
                case 'InnerRandomStreamID':
                    this.writeInnerRandomStreamID(stm);
                    break;
                case 'KdfParameters':
                    this.writeKdfParameters(stm);
                    break;
                case 'PublicCustomData':
                    this.writePublicCustomData(stm);
                    break;
                case 'InnerRandomStreamKey':
                    this.writeInnerRandomStreamKey(stm);
                    break;
                case 'Binary':
                    if (!ctx) {
                        throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'context is not set');
                    }
                    this.writeBinary(stm, ctx);
                    break;
                default:
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, `Bad header field: ${headerField.name}`);
            }
        }
    }
    readFieldSize(stm) {
        return (this.versionMajor | 0) >= 4 ? stm.getUint32(true) : stm.getUint16(true);
    }
    writeFieldSize(stm, size) {
        if ((this.versionMajor | 0) >= 4) {
            stm.setUint32(size, true);
        }
        else {
            stm.setUint16(size, true);
        }
    }
    writeFieldBytes(stm, bytes) {
        this.writeFieldSize(stm, bytes.byteLength);
        stm.writeBytes(bytes);
    }
    validate() {
        if (!this.versionMajor || this.versionMinor === undefined) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no version in header');
        }
        if (this.dataCipherUuid === undefined) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no cipher in header');
        }
        if (this.compression === undefined) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no compression in header');
        }
        if (!this.masterSeed) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no master seed in header');
        }
        if (this.versionMajor < 4 && !this.transformSeed) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no transform seed in header');
        }
        if (this.versionMajor < 4 && !this.keyEncryptionRounds) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no key encryption rounds in header');
        }
        if (!this.encryptionIV) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no encryption iv in header');
        }
        if (this.versionMajor < 4 && !this.protectedStreamKey) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no protected stream key in header');
        }
        if (this.versionMajor < 4 && !this.streamStartBytes) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no stream start bytes in header');
        }
        if (this.versionMajor < 4 && !this.crsAlgorithm) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no crs algorithm in header');
        }
        if (this.versionMajor >= 4 && !this.kdfParameters) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no kdf parameters in header');
        }
    }
    validateInner() {
        if (!this.protectedStreamKey) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no protected stream key in header');
        }
        if (!this.crsAlgorithm) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'no crs algorithm in header');
        }
    }
    createKdfParameters(algo) {
        if (!algo) {
            algo = HeaderConst.DefaultKdfAlgo;
        }
        switch (algo) {
            case consts_1.KdfId.Argon2d:
            case consts_1.KdfId.Argon2id:
                this.kdfParameters = new var_dictionary_1.VarDictionary();
                this.kdfParameters.set('$UUID', var_dictionary_1.ValueType.Bytes, (0, byte_utils_1.base64ToBytes)(algo));
                this.kdfParameters.set('S', var_dictionary_1.ValueType.Bytes, CryptoEngine.random(HeaderConst.DefaultKdfSaltLength));
                this.kdfParameters.set('P', var_dictionary_1.ValueType.UInt32, HeaderConst.DefaultKdfParallelism);
                this.kdfParameters.set('I', var_dictionary_1.ValueType.UInt64, new int64_1.Int64(HeaderConst.DefaultKdfIterations));
                this.kdfParameters.set('M', var_dictionary_1.ValueType.UInt64, new int64_1.Int64(HeaderConst.DefaultKdfMemory));
                this.kdfParameters.set('V', var_dictionary_1.ValueType.UInt32, HeaderConst.DefaultKdfVersion);
                break;
            case consts_1.KdfId.Aes:
                this.kdfParameters = new var_dictionary_1.VarDictionary();
                this.kdfParameters.set('$UUID', var_dictionary_1.ValueType.Bytes, (0, byte_utils_1.base64ToBytes)(consts_1.KdfId.Aes));
                this.kdfParameters.set('S', var_dictionary_1.ValueType.Bytes, CryptoEngine.random(HeaderConst.DefaultKdfSaltLength));
                this.kdfParameters.set('R', var_dictionary_1.ValueType.UInt64, new int64_1.Int64(consts_1.Defaults.KeyEncryptionRounds));
                break;
            default:
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'bad KDF algo');
        }
    }
    write(stm) {
        this.validate();
        this.writeSignature(stm);
        this.writeVersion(stm);
        for (let id = 1; id < HeaderFields.length; id++) {
            this.writeField(stm, id, HeaderFields);
        }
        this.writeField(stm, 0, HeaderFields);
        this.endPos = stm.pos;
    }
    writeInnerHeader(stm, ctx) {
        this.validateInner();
        for (let id = 1; id < InnerHeaderFields.length; id++) {
            this.writeField(stm, id, InnerHeaderFields, ctx);
        }
        this.writeField(stm, 0, InnerHeaderFields, ctx);
    }
    generateSalts() {
        this.masterSeed = CryptoEngine.random(32);
        if (this.versionMajor < 4) {
            this.transformSeed = CryptoEngine.random(32);
            this.streamStartBytes = CryptoEngine.random(32);
            this.protectedStreamKey = CryptoEngine.random(32);
            this.encryptionIV = CryptoEngine.random(16);
        }
        else {
            this.protectedStreamKey = CryptoEngine.random(64);
            if (!this.kdfParameters || !this.dataCipherUuid) {
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'no kdf params');
            }
            this.kdfParameters.set('S', var_dictionary_1.ValueType.Bytes, CryptoEngine.random(32));
            const ivLength = this.dataCipherUuid.toString() === consts_1.CipherId.ChaCha20 ? 12 : 16;
            this.encryptionIV = CryptoEngine.random(ivLength);
        }
    }
    setVersion(version) {
        if (version !== 3 && version !== 4) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'bad file version');
        }
        this.versionMajor = version;
        this.versionMinor = DefaultMinorVersions[version];
        if (this.versionMajor === 4) {
            if (!this.kdfParameters) {
                this.createKdfParameters();
            }
            this.crsAlgorithm = consts_1.CrsAlgorithm.ChaCha20;
            this.keyEncryptionRounds = undefined;
        }
        else {
            this.kdfParameters = undefined;
            this.crsAlgorithm = consts_1.CrsAlgorithm.Salsa20;
            this.keyEncryptionRounds = consts_1.Defaults.KeyEncryptionRounds;
        }
    }
    setKdf(kdf) {
        this.createKdfParameters(kdf);
    }
    static read(stm, ctx) {
        const header = new KdbxHeader();
        header.readSignature(stm);
        header.readVersion(stm);
        while (header.readField(stm, HeaderFields, ctx)) { }
        header.endPos = stm.pos;
        header.validate();
        return header;
    }
    readInnerHeader(stm, ctx) {
        while (this.readField(stm, InnerHeaderFields, ctx)) { }
        this.validateInner();
    }
    static create() {
        const header = new KdbxHeader();
        header.versionMajor = HeaderConst.DefaultFileVersionMajor;
        header.versionMinor = DefaultMinorVersions[HeaderConst.DefaultFileVersionMajor];
        header.dataCipherUuid = new kdbx_uuid_1.KdbxUuid(consts_1.CipherId.Aes);
        header.compression = consts_1.CompressionAlgorithm.GZip;
        header.crsAlgorithm = consts_1.CrsAlgorithm.ChaCha20;
        header.createKdfParameters();
        return header;
    }
}
exports.KdbxHeader = KdbxHeader;
KdbxHeader.MaxFileVersion = HeaderConst.MaxSupportedVersion;


/***/ }),

/***/ "./format/kdbx-meta.ts":
/*!*****************************!*\
  !*** ./format/kdbx-meta.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxMeta = void 0;
const kdbx_uuid_1 = __webpack_require__(/*! ./kdbx-uuid */ "./format/kdbx-uuid.ts");
const XmlUtils = __webpack_require__(/*! ../utils/xml-utils */ "./utils/xml-utils.ts");
const XmlNames = __webpack_require__(/*! ../defs/xml-names */ "./defs/xml-names.ts");
const kdbx_custom_data_1 = __webpack_require__(/*! ./kdbx-custom-data */ "./format/kdbx-custom-data.ts");
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const kdbx_binaries_1 = __webpack_require__(/*! ./kdbx-binaries */ "./format/kdbx-binaries.ts");
const MetaConst = {
    Generator: 'KdbxWeb'
};
class KdbxMeta {
    constructor() {
        this._memoryProtection = {};
        this.customData = new Map();
        this.customIcons = new Map();
    }
    get editState() {
        return this._editState;
    }
    set editState(value) {
        this._editState = value;
    }
    getOrCreateEditState() {
        if (!this._editState) {
            this._editState = {};
        }
        return this._editState;
    }
    get name() {
        return this._name;
    }
    set name(value) {
        if (value !== this._name) {
            this._name = value;
            this.nameChanged = new Date();
        }
    }
    get desc() {
        return this._desc;
    }
    set desc(value) {
        if (value !== this._desc) {
            this._desc = value;
            this.descChanged = new Date();
        }
    }
    get defaultUser() {
        return this._defaultUser;
    }
    set defaultUser(value) {
        if (value !== this._defaultUser) {
            this._defaultUser = value;
            this.defaultUserChanged = new Date();
        }
    }
    get mntncHistoryDays() {
        return this._mntncHistoryDays;
    }
    set mntncHistoryDays(value) {
        if (value !== this._mntncHistoryDays) {
            this._mntncHistoryDays = value;
            this.getOrCreateEditState().mntncHistoryDaysChanged = new Date();
        }
    }
    get color() {
        return this._color;
    }
    set color(value) {
        if (value !== this._color) {
            this._color = value;
            this.getOrCreateEditState().colorChanged = new Date();
        }
    }
    get keyChangeRec() {
        return this._keyChangeRec;
    }
    set keyChangeRec(value) {
        if (value !== this._keyChangeRec) {
            this._keyChangeRec = value;
            this.getOrCreateEditState().keyChangeRecChanged = new Date();
        }
    }
    get keyChangeForce() {
        return this._keyChangeForce;
    }
    set keyChangeForce(value) {
        if (value !== this._keyChangeForce) {
            this._keyChangeForce = value;
            this.getOrCreateEditState().keyChangeForceChanged = new Date();
        }
    }
    get recycleBinEnabled() {
        return this._recycleBinEnabled;
    }
    set recycleBinEnabled(value) {
        if (value !== this._recycleBinEnabled) {
            this._recycleBinEnabled = value;
            this.recycleBinChanged = new Date();
        }
    }
    get recycleBinUuid() {
        return this._recycleBinUuid;
    }
    set recycleBinUuid(value) {
        if (value !== this._recycleBinUuid) {
            this._recycleBinUuid = value;
            this.recycleBinChanged = new Date();
        }
    }
    get entryTemplatesGroup() {
        return this._entryTemplatesGroup;
    }
    set entryTemplatesGroup(value) {
        if (value !== this._entryTemplatesGroup) {
            this._entryTemplatesGroup = value;
            this.entryTemplatesGroupChanged = new Date();
        }
    }
    get historyMaxItems() {
        return this._historyMaxItems;
    }
    set historyMaxItems(value) {
        if (value !== this._historyMaxItems) {
            this._historyMaxItems = value;
            this.getOrCreateEditState().historyMaxItemsChanged = new Date();
        }
    }
    get historyMaxSize() {
        return this._historyMaxSize;
    }
    set historyMaxSize(value) {
        if (value !== this._historyMaxSize) {
            this._historyMaxSize = value;
            this.getOrCreateEditState().historyMaxSizeChanged = new Date();
        }
    }
    get lastSelectedGroup() {
        return this._lastSelectedGroup;
    }
    set lastSelectedGroup(value) {
        if (value !== this._lastSelectedGroup) {
            this._lastSelectedGroup = value;
            this.getOrCreateEditState().lastSelectedGroupChanged = new Date();
        }
    }
    get lastTopVisibleGroup() {
        return this._lastTopVisibleGroup;
    }
    set lastTopVisibleGroup(value) {
        if (value !== this._lastTopVisibleGroup) {
            this._lastTopVisibleGroup = value;
            this.getOrCreateEditState().lastTopVisibleGroupChanged = new Date();
        }
    }
    get memoryProtection() {
        return this._memoryProtection;
    }
    set memoryProtection(value) {
        if (value !== this._memoryProtection) {
            this._memoryProtection = value;
            this.getOrCreateEditState().memoryProtectionChanged = new Date();
        }
    }
    readNode(node, ctx) {
        var _a;
        switch (node.tagName) {
            case XmlNames.Elem.Generator:
                this.generator = XmlUtils.getText(node);
                break;
            case XmlNames.Elem.HeaderHash:
                this.headerHash = XmlUtils.getBytes(node);
                break;
            case XmlNames.Elem.SettingsChanged:
                this.settingsChanged = XmlUtils.getDate(node);
                break;
            case XmlNames.Elem.DbName:
                this._name = XmlUtils.getText(node);
                break;
            case XmlNames.Elem.DbNameChanged:
                this.nameChanged = XmlUtils.getDate(node);
                break;
            case XmlNames.Elem.DbDesc:
                this._desc = XmlUtils.getText(node);
                break;
            case XmlNames.Elem.DbDescChanged:
                this.descChanged = XmlUtils.getDate(node);
                break;
            case XmlNames.Elem.DbDefaultUser:
                this._defaultUser = XmlUtils.getText(node);
                break;
            case XmlNames.Elem.DbDefaultUserChanged:
                this.defaultUserChanged = XmlUtils.getDate(node);
                break;
            case XmlNames.Elem.DbMntncHistoryDays:
                this._mntncHistoryDays = XmlUtils.getNumber(node);
                break;
            case XmlNames.Elem.DbColor:
                this._color = XmlUtils.getText(node);
                break;
            case XmlNames.Elem.DbKeyChanged:
                this.keyChanged = XmlUtils.getDate(node);
                break;
            case XmlNames.Elem.DbKeyChangeRec:
                this._keyChangeRec = XmlUtils.getNumber(node);
                break;
            case XmlNames.Elem.DbKeyChangeForce:
                this._keyChangeForce = XmlUtils.getNumber(node);
                break;
            case XmlNames.Elem.RecycleBinEnabled:
                this._recycleBinEnabled = (_a = XmlUtils.getBoolean(node)) !== null && _a !== void 0 ? _a : undefined;
                break;
            case XmlNames.Elem.RecycleBinUuid:
                this._recycleBinUuid = XmlUtils.getUuid(node);
                break;
            case XmlNames.Elem.RecycleBinChanged:
                this.recycleBinChanged = XmlUtils.getDate(node);
                break;
            case XmlNames.Elem.EntryTemplatesGroup:
                this._entryTemplatesGroup = XmlUtils.getUuid(node);
                break;
            case XmlNames.Elem.EntryTemplatesGroupChanged:
                this.entryTemplatesGroupChanged = XmlUtils.getDate(node);
                break;
            case XmlNames.Elem.HistoryMaxItems:
                this._historyMaxItems = XmlUtils.getNumber(node);
                break;
            case XmlNames.Elem.HistoryMaxSize:
                this._historyMaxSize = XmlUtils.getNumber(node);
                break;
            case XmlNames.Elem.LastSelectedGroup:
                this._lastSelectedGroup = XmlUtils.getUuid(node);
                break;
            case XmlNames.Elem.LastTopVisibleGroup:
                this._lastTopVisibleGroup = XmlUtils.getUuid(node);
                break;
            case XmlNames.Elem.MemoryProt:
                this.readMemoryProtection(node);
                break;
            case XmlNames.Elem.CustomIcons:
                this.readCustomIcons(node);
                break;
            case XmlNames.Elem.Binaries:
                this.readBinaries(node, ctx);
                break;
            case XmlNames.Elem.CustomData:
                this.readCustomData(node);
                break;
        }
    }
    readMemoryProtection(node) {
        var _a, _b, _c, _d, _e;
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            switch (childNode.tagName) {
                case XmlNames.Elem.ProtTitle:
                    this.memoryProtection.title = (_a = XmlUtils.getBoolean(childNode)) !== null && _a !== void 0 ? _a : undefined;
                    break;
                case XmlNames.Elem.ProtUserName:
                    this.memoryProtection.userName = (_b = XmlUtils.getBoolean(childNode)) !== null && _b !== void 0 ? _b : undefined;
                    break;
                case XmlNames.Elem.ProtPassword:
                    this.memoryProtection.password = (_c = XmlUtils.getBoolean(childNode)) !== null && _c !== void 0 ? _c : undefined;
                    break;
                case XmlNames.Elem.ProtUrl:
                    this.memoryProtection.url = (_d = XmlUtils.getBoolean(childNode)) !== null && _d !== void 0 ? _d : undefined;
                    break;
                case XmlNames.Elem.ProtNotes:
                    this.memoryProtection.notes = (_e = XmlUtils.getBoolean(childNode)) !== null && _e !== void 0 ? _e : undefined;
                    break;
            }
        }
    }
    writeMemoryProtection(parentNode) {
        const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.MemoryProt);
        XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.ProtTitle), this.memoryProtection.title);
        XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.ProtUserName), this.memoryProtection.userName);
        XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.ProtPassword), this.memoryProtection.password);
        XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.ProtUrl), this.memoryProtection.url);
        XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.ProtNotes), this.memoryProtection.notes);
    }
    readCustomIcons(node) {
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            if (childNode.tagName === XmlNames.Elem.CustomIconItem) {
                this.readCustomIcon(childNode);
            }
        }
    }
    readCustomIcon(node) {
        var _a;
        let uuid, data, name, lastModified;
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            switch (childNode.tagName) {
                case XmlNames.Elem.CustomIconItemID:
                    uuid = XmlUtils.getUuid(childNode);
                    break;
                case XmlNames.Elem.CustomIconItemData:
                    data = XmlUtils.getBytes(childNode);
                    break;
                case XmlNames.Elem.CustomIconItemName:
                    name = (_a = XmlUtils.getText(childNode)) !== null && _a !== void 0 ? _a : undefined;
                    break;
                case XmlNames.Elem.LastModTime:
                    lastModified = XmlUtils.getDate(childNode);
                    break;
            }
        }
        if (uuid && data) {
            this.customIcons.set(uuid.id, { data, name, lastModified });
        }
    }
    writeCustomIcons(parentNode, ctx) {
        const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.CustomIcons);
        for (const [uuid, { data, name, lastModified }] of this.customIcons) {
            if (data) {
                const itemNode = XmlUtils.addChildNode(node, XmlNames.Elem.CustomIconItem);
                XmlUtils.setUuid(XmlUtils.addChildNode(itemNode, XmlNames.Elem.CustomIconItemID), uuid);
                XmlUtils.setBytes(XmlUtils.addChildNode(itemNode, XmlNames.Elem.CustomIconItemData), data);
                if (ctx.kdbx.versionIsAtLeast(4, 1)) {
                    if (name) {
                        XmlUtils.setText(XmlUtils.addChildNode(itemNode, XmlNames.Elem.CustomIconItemName), name);
                    }
                    if (lastModified) {
                        XmlUtils.setDate(XmlUtils.addChildNode(itemNode, XmlNames.Elem.LastModTime), lastModified);
                    }
                }
            }
        }
    }
    readBinaries(node, ctx) {
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            if (childNode.tagName === XmlNames.Elem.Binary) {
                this.readBinary(childNode, ctx);
            }
        }
    }
    readBinary(node, ctx) {
        const id = node.getAttribute(XmlNames.Attr.Id);
        const binary = XmlUtils.getProtectedBinary(node);
        if (id && binary) {
            if (kdbx_binaries_1.KdbxBinaries.isKdbxBinaryRef(binary)) {
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'binary ref in meta');
            }
            ctx.kdbx.binaries.addWithId(id, binary);
        }
    }
    writeBinaries(parentNode, ctx) {
        const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.Binaries);
        const binaries = ctx.kdbx.binaries.getAll();
        for (const binary of binaries) {
            const itemNode = XmlUtils.addChildNode(node, XmlNames.Elem.Binary);
            itemNode.setAttribute(XmlNames.Attr.Id, binary.ref);
            XmlUtils.setProtectedBinary(itemNode, binary.value);
        }
    }
    readCustomData(node) {
        this.customData = kdbx_custom_data_1.KdbxCustomData.read(node);
    }
    writeCustomData(parentNode, ctx) {
        kdbx_custom_data_1.KdbxCustomData.write(parentNode, ctx, this.customData);
    }
    write(parentNode, ctx) {
        this.generator = MetaConst.Generator;
        const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.Meta);
        XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.Generator), MetaConst.Generator);
        if (ctx.kdbx.versionMajor < 4) {
            XmlUtils.setBytes(XmlUtils.addChildNode(node, XmlNames.Elem.HeaderHash), this.headerHash);
        }
        else if (this.settingsChanged) {
            ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.SettingsChanged), this.settingsChanged);
        }
        XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.DbName), this.name);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.DbNameChanged), this.nameChanged);
        XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.DbDesc), this.desc);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.DbDescChanged), this.descChanged);
        XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.DbDefaultUser), this.defaultUser);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.DbDefaultUserChanged), this.defaultUserChanged);
        XmlUtils.setNumber(XmlUtils.addChildNode(node, XmlNames.Elem.DbMntncHistoryDays), this.mntncHistoryDays);
        XmlUtils.setText(XmlUtils.addChildNode(node, XmlNames.Elem.DbColor), this.color);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.DbKeyChanged), this.keyChanged);
        XmlUtils.setNumber(XmlUtils.addChildNode(node, XmlNames.Elem.DbKeyChangeRec), this.keyChangeRec);
        XmlUtils.setNumber(XmlUtils.addChildNode(node, XmlNames.Elem.DbKeyChangeForce), this.keyChangeForce);
        XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.RecycleBinEnabled), this.recycleBinEnabled);
        XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.RecycleBinUuid), this.recycleBinUuid);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.RecycleBinChanged), this.recycleBinChanged);
        XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.EntryTemplatesGroup), this.entryTemplatesGroup);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.EntryTemplatesGroupChanged), this.entryTemplatesGroupChanged);
        XmlUtils.setNumber(XmlUtils.addChildNode(node, XmlNames.Elem.HistoryMaxItems), this.historyMaxItems);
        XmlUtils.setNumber(XmlUtils.addChildNode(node, XmlNames.Elem.HistoryMaxSize), this.historyMaxSize);
        XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.LastSelectedGroup), this.lastSelectedGroup);
        XmlUtils.setUuid(XmlUtils.addChildNode(node, XmlNames.Elem.LastTopVisibleGroup), this.lastTopVisibleGroup);
        this.writeMemoryProtection(node);
        this.writeCustomIcons(node, ctx);
        if (ctx.exportXml || ctx.kdbx.versionMajor < 4) {
            this.writeBinaries(node, ctx);
        }
        this.writeCustomData(node, ctx);
    }
    merge(remote, objectMap) {
        var _a, _b, _c, _d, _e, _f;
        if (this.needUpdate(remote.nameChanged, this.nameChanged)) {
            this._name = remote.name;
            this.nameChanged = remote.nameChanged;
        }
        if (this.needUpdate(remote.descChanged, this.descChanged)) {
            this._desc = remote.desc;
            this.descChanged = remote.descChanged;
        }
        if (this.needUpdate(remote.defaultUserChanged, this.defaultUserChanged)) {
            this._defaultUser = remote.defaultUser;
            this.defaultUserChanged = remote.defaultUserChanged;
        }
        if (this.needUpdate(remote.keyChanged, this.keyChanged)) {
            this.keyChanged = remote.keyChanged;
        }
        if (this.needUpdate(remote.settingsChanged, this.settingsChanged)) {
            this.settingsChanged = remote.settingsChanged;
        }
        if (this.needUpdate(remote.recycleBinChanged, this.recycleBinChanged)) {
            this._recycleBinEnabled = remote.recycleBinEnabled;
            this._recycleBinUuid = remote.recycleBinUuid;
            this.recycleBinChanged = remote.recycleBinChanged;
        }
        if (this.needUpdate(remote.entryTemplatesGroupChanged, this.entryTemplatesGroupChanged)) {
            this._entryTemplatesGroup = remote.entryTemplatesGroup;
            this.entryTemplatesGroupChanged = remote.entryTemplatesGroupChanged;
        }
        this.mergeMapWithDates(this.customData, remote.customData, objectMap);
        this.mergeMapWithDates(this.customIcons, remote.customIcons, objectMap);
        if (!((_a = this._editState) === null || _a === void 0 ? void 0 : _a.historyMaxItemsChanged)) {
            this.historyMaxItems = remote.historyMaxItems;
        }
        if (!((_b = this._editState) === null || _b === void 0 ? void 0 : _b.historyMaxSizeChanged)) {
            this.historyMaxSize = remote.historyMaxSize;
        }
        if (!((_c = this._editState) === null || _c === void 0 ? void 0 : _c.keyChangeRecChanged)) {
            this.keyChangeRec = remote.keyChangeRec;
        }
        if (!((_d = this._editState) === null || _d === void 0 ? void 0 : _d.keyChangeForceChanged)) {
            this.keyChangeForce = remote.keyChangeForce;
        }
        if (!((_e = this._editState) === null || _e === void 0 ? void 0 : _e.mntncHistoryDaysChanged)) {
            this.mntncHistoryDays = remote.mntncHistoryDays;
        }
        if (!((_f = this._editState) === null || _f === void 0 ? void 0 : _f.colorChanged)) {
            this.color = remote.color;
        }
    }
    mergeMapWithDates(local, remote, objectMap) {
        for (const [key, remoteItem] of remote) {
            const existingItem = local.get(key);
            if (existingItem) {
                if (existingItem.lastModified &&
                    remoteItem.lastModified &&
                    remoteItem.lastModified > existingItem.lastModified) {
                    local.set(key, remoteItem);
                }
            }
            else if (!objectMap.deleted.has(key)) {
                local.set(key, remoteItem);
            }
        }
    }
    needUpdate(remoteDate, localDate) {
        if (!remoteDate) {
            return false;
        }
        if (!localDate) {
            return true;
        }
        return remoteDate > localDate;
    }
    /**
     * Creates new meta
     * @returns {KdbxMeta}
     */
    static create() {
        const now = new Date();
        const meta = new KdbxMeta();
        meta.generator = MetaConst.Generator;
        meta.settingsChanged = now;
        meta.mntncHistoryDays = consts_1.Defaults.MntncHistoryDays;
        meta.recycleBinEnabled = true;
        meta.historyMaxItems = consts_1.Defaults.HistoryMaxItems;
        meta.historyMaxSize = consts_1.Defaults.HistoryMaxSize;
        meta.nameChanged = now;
        meta.descChanged = now;
        meta.defaultUserChanged = now;
        meta.recycleBinChanged = now;
        meta.keyChangeRec = -1;
        meta.keyChangeForce = -1;
        meta.entryTemplatesGroup = new kdbx_uuid_1.KdbxUuid();
        meta.entryTemplatesGroupChanged = now;
        meta.memoryProtection = {
            title: false,
            userName: false,
            password: true,
            url: false,
            notes: false
        };
        return meta;
    }
    static read(xmlNode, ctx) {
        const meta = new KdbxMeta();
        for (let i = 0, cn = xmlNode.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            if (childNode.tagName) {
                meta.readNode(childNode, ctx);
            }
        }
        return meta;
    }
}
exports.KdbxMeta = KdbxMeta;


/***/ }),

/***/ "./format/kdbx-times.ts":
/*!******************************!*\
  !*** ./format/kdbx-times.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxTimes = void 0;
const XmlNames = __webpack_require__(/*! ./../defs/xml-names */ "./defs/xml-names.ts");
const XmlUtils = __webpack_require__(/*! ./../utils/xml-utils */ "./utils/xml-utils.ts");
class KdbxTimes {
    readNode(node) {
        switch (node.tagName) {
            case XmlNames.Elem.CreationTime:
                this.creationTime = XmlUtils.getDate(node);
                break;
            case XmlNames.Elem.LastModTime:
                this.lastModTime = XmlUtils.getDate(node);
                break;
            case XmlNames.Elem.LastAccessTime:
                this.lastAccessTime = XmlUtils.getDate(node);
                break;
            case XmlNames.Elem.ExpiryTime:
                this.expiryTime = XmlUtils.getDate(node);
                break;
            case XmlNames.Elem.Expires:
                this.expires = XmlUtils.getBoolean(node);
                break;
            case XmlNames.Elem.UsageCount:
                this.usageCount = XmlUtils.getNumber(node);
                break;
            case XmlNames.Elem.LocationChanged:
                this.locationChanged = XmlUtils.getDate(node);
                break;
        }
    }
    clone() {
        const clone = new KdbxTimes();
        clone.creationTime = this.creationTime;
        clone.lastModTime = this.lastModTime;
        clone.lastAccessTime = this.lastAccessTime;
        clone.expiryTime = this.expiryTime;
        clone.expires = this.expires;
        clone.usageCount = this.usageCount;
        clone.locationChanged = this.locationChanged;
        return clone;
    }
    update() {
        const now = new Date();
        this.lastModTime = now;
        this.lastAccessTime = now;
    }
    write(parentNode, ctx) {
        const node = XmlUtils.addChildNode(parentNode, XmlNames.Elem.Times);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.CreationTime), this.creationTime);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.LastModTime), this.lastModTime);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.LastAccessTime), this.lastAccessTime);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.ExpiryTime), this.expiryTime);
        XmlUtils.setBoolean(XmlUtils.addChildNode(node, XmlNames.Elem.Expires), this.expires);
        XmlUtils.setNumber(XmlUtils.addChildNode(node, XmlNames.Elem.UsageCount), this.usageCount);
        ctx.setXmlDate(XmlUtils.addChildNode(node, XmlNames.Elem.LocationChanged), this.locationChanged);
    }
    static create() {
        const times = new KdbxTimes();
        const now = new Date();
        times.creationTime = now;
        times.lastModTime = now;
        times.lastAccessTime = now;
        times.expiryTime = now;
        times.expires = false;
        times.usageCount = 0;
        times.locationChanged = now;
        return times;
    }
    static read(xmlNode) {
        const obj = new KdbxTimes();
        for (let i = 0, cn = xmlNode.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            if (childNode.tagName) {
                obj.readNode(childNode);
            }
        }
        return obj;
    }
}
exports.KdbxTimes = KdbxTimes;


/***/ }),

/***/ "./format/kdbx-uuid.ts":
/*!*****************************!*\
  !*** ./format/kdbx-uuid.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KdbxUuid = void 0;
const byte_utils_1 = __webpack_require__(/*! ../utils/byte-utils */ "./utils/byte-utils.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const CryptoEngine = __webpack_require__(/*! ../crypto/crypto-engine */ "./crypto/crypto-engine.ts");
const UuidLength = 16;
const EmptyUuidStr = 'AAAAAAAAAAAAAAAAAAAAAA==';
class KdbxUuid {
    constructor(ab) {
        if (ab === undefined) {
            ab = new ArrayBuffer(UuidLength);
        }
        else if (typeof ab === 'string') {
            ab = (0, byte_utils_1.base64ToBytes)(ab);
        }
        if (ab.byteLength !== UuidLength) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, `bad UUID length: ${ab.byteLength}`);
        }
        this.id = (0, byte_utils_1.bytesToBase64)(ab);
        this.empty = this.id === EmptyUuidStr;
    }
    equals(other) {
        return (other && other.toString() === this.toString()) || false;
    }
    get bytes() {
        return this.toBytes();
    }
    static random() {
        return new KdbxUuid(CryptoEngine.random(UuidLength));
    }
    toString() {
        return this.id;
    }
    valueOf() {
        return this.id;
    }
    toBytes() {
        return (0, byte_utils_1.base64ToBytes)(this.id);
    }
}
exports.KdbxUuid = KdbxUuid;


/***/ }),

/***/ "./format/kdbx.ts":
/*!************************!*\
  !*** ./format/kdbx.ts ***!
  \************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Kdbx = void 0;
const XmlNames = __webpack_require__(/*! ../defs/xml-names */ "./defs/xml-names.ts");
const XmlUtils = __webpack_require__(/*! ./../utils/xml-utils */ "./utils/xml-utils.ts");
const kdbx_binaries_1 = __webpack_require__(/*! ./kdbx-binaries */ "./format/kdbx-binaries.ts");
const kdbx_deleted_object_1 = __webpack_require__(/*! ./kdbx-deleted-object */ "./format/kdbx-deleted-object.ts");
const kdbx_group_1 = __webpack_require__(/*! ./kdbx-group */ "./format/kdbx-group.ts");
const kdbx_meta_1 = __webpack_require__(/*! ./kdbx-meta */ "./format/kdbx-meta.ts");
const kdbx_credentials_1 = __webpack_require__(/*! ./kdbx-credentials */ "./format/kdbx-credentials.ts");
const kdbx_header_1 = __webpack_require__(/*! ./kdbx-header */ "./format/kdbx-header.ts");
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const kdbx_format_1 = __webpack_require__(/*! ./kdbx-format */ "./format/kdbx-format.ts");
const kdbx_entry_1 = __webpack_require__(/*! ./kdbx-entry */ "./format/kdbx-entry.ts");
const kdbx_uuid_1 = __webpack_require__(/*! ./kdbx-uuid */ "./format/kdbx-uuid.ts");
class Kdbx {
    constructor() {
        this.header = new kdbx_header_1.KdbxHeader();
        this.credentials = new kdbx_credentials_1.KdbxCredentials(null);
        this.meta = new kdbx_meta_1.KdbxMeta();
        this.binaries = new kdbx_binaries_1.KdbxBinaries();
        this.groups = [];
        this.deletedObjects = [];
    }
    get versionMajor() {
        return this.header.versionMajor;
    }
    get versionMinor() {
        return this.header.versionMinor;
    }
    /**
     * Creates a new database
     */
    static create(credentials, name) {
        if (!(credentials instanceof kdbx_credentials_1.KdbxCredentials)) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'credentials');
        }
        const kdbx = new Kdbx();
        kdbx.credentials = credentials;
        kdbx.header = kdbx_header_1.KdbxHeader.create();
        kdbx.meta = kdbx_meta_1.KdbxMeta.create();
        kdbx.meta._name = name;
        kdbx.createDefaultGroup();
        kdbx.createRecycleBin();
        kdbx.meta._lastSelectedGroup = kdbx.getDefaultGroup().uuid;
        kdbx.meta._lastTopVisibleGroup = kdbx.getDefaultGroup().uuid;
        return kdbx;
    }
    /**
     * Load a kdbx file
     * If there was an error loading file, throws an exception
     */
    static load(data, credentials, options) {
        if (!(data instanceof ArrayBuffer)) {
            return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'data'));
        }
        if (!(credentials instanceof kdbx_credentials_1.KdbxCredentials)) {
            return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'credentials'));
        }
        const kdbx = new Kdbx();
        kdbx.credentials = credentials;
        const format = new kdbx_format_1.KdbxFormat(kdbx);
        format.preserveXml = (options === null || options === void 0 ? void 0 : options.preserveXml) || false;
        return format.load(data);
    }
    /**
     * Import database from an xml file
     * If there was an error loading file, throws an exception
     */
    static loadXml(data, credentials) {
        if (typeof data !== 'string') {
            return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'data'));
        }
        if (!(credentials instanceof kdbx_credentials_1.KdbxCredentials)) {
            return Promise.reject(new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg, 'credentials'));
        }
        const kdbx = new Kdbx();
        kdbx.credentials = credentials;
        const format = new kdbx_format_1.KdbxFormat(kdbx);
        return format.loadXml(data);
    }
    /**
     * Save the db to ArrayBuffer
     */
    save() {
        const format = new kdbx_format_1.KdbxFormat(this);
        return format.save();
    }
    /**
     * Save the db as XML string
     */
    saveXml(prettyPrint = false) {
        const format = new kdbx_format_1.KdbxFormat(this);
        return format.saveXml(prettyPrint);
    }
    /**
     * Creates a default group, if it's not yet created
     */
    createDefaultGroup() {
        if (this.groups.length) {
            return;
        }
        const defaultGroup = kdbx_group_1.KdbxGroup.create(this.meta.name || '');
        defaultGroup.icon = consts_1.Icons.FolderOpen;
        defaultGroup.expanded = true;
        this.groups.push(defaultGroup);
    }
    /**
     * Creates a recycle bin group, if it's not yet created
     */
    createRecycleBin() {
        this.meta.recycleBinEnabled = true;
        if (this.meta.recycleBinUuid && this.getGroup(this.meta.recycleBinUuid)) {
            return;
        }
        const defGrp = this.getDefaultGroup();
        const recycleBin = kdbx_group_1.KdbxGroup.create(consts_1.Defaults.RecycleBinName, defGrp);
        recycleBin.icon = consts_1.Icons.TrashBin;
        recycleBin.enableAutoType = false;
        recycleBin.enableSearching = false;
        this.meta.recycleBinUuid = recycleBin.uuid;
        defGrp.groups.push(recycleBin);
    }
    /**
     * Adds a new group to an existing group
     */
    createGroup(group, name) {
        const subGroup = kdbx_group_1.KdbxGroup.create(name, group);
        group.groups.push(subGroup);
        return subGroup;
    }
    /**
     * Adds a new entry to a group
     */
    createEntry(group) {
        const entry = kdbx_entry_1.KdbxEntry.create(this.meta, group);
        group.entries.push(entry);
        return entry;
    }
    /**
     * Gets the default group
     */
    getDefaultGroup() {
        if (!this.groups[0]) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'empty default group');
        }
        return this.groups[0];
    }
    /**
     * Get a group by uuid, returns undefined if it's not found
     */
    getGroup(uuid, parentGroup) {
        const groups = parentGroup ? parentGroup.groups : this.groups;
        for (const group of groups) {
            if (group.uuid.equals(uuid)) {
                return group;
            }
            const res = this.getGroup(uuid, group);
            if (res) {
                return res;
            }
        }
    }
    /**
     * Move an object from one group to another
     * @param object - object to be moved
     * @param toGroup - target parent group
     * @param atIndex - index in target group (by default, insert to the end of the group)
     */
    move(object, toGroup, atIndex) {
        var _a, _b;
        const containerProp = object instanceof kdbx_group_1.KdbxGroup ? 'groups' : 'entries';
        const fromContainer = (_a = object.parentGroup) === null || _a === void 0 ? void 0 : _a[containerProp];
        const ix = fromContainer === null || fromContainer === void 0 ? void 0 : fromContainer.indexOf(object);
        if (typeof ix !== 'number' || ix < 0) {
            return;
        }
        fromContainer.splice(ix, 1);
        if (toGroup) {
            const toContainer = toGroup[containerProp];
            if (typeof atIndex === 'number' && atIndex >= 0) {
                toContainer.splice(atIndex, 0, object);
            }
            else {
                toContainer.push(object);
            }
        }
        else {
            const now = new Date();
            if (object instanceof kdbx_group_1.KdbxGroup) {
                for (const item of object.allGroupsAndEntries()) {
                    const uuid = item.uuid;
                    this.addDeletedObject(uuid, now);
                }
            }
            else {
                if (object.uuid) {
                    this.addDeletedObject(object.uuid, now);
                }
            }
        }
        object.previousParentGroup = (_b = object.parentGroup) === null || _b === void 0 ? void 0 : _b.uuid;
        object.parentGroup = toGroup !== null && toGroup !== void 0 ? toGroup : undefined;
        object.times.locationChanged = new Date();
    }
    /**
     * Adds a so-called deleted object, this is used to keep track of objects during merging
     * @param uuid - object uuid
     * @param dt - deletion date
     */
    addDeletedObject(uuid, dt) {
        const deletedObject = new kdbx_deleted_object_1.KdbxDeletedObject();
        deletedObject.uuid = uuid;
        deletedObject.deletionTime = dt;
        this.deletedObjects.push(deletedObject);
    }
    /**
     * Delete an entry or a group
     * Depending on settings, removes either to trash, or completely
     */
    remove(object) {
        let toGroup = undefined;
        if (this.meta.recycleBinEnabled && this.meta.recycleBinUuid) {
            this.createRecycleBin();
            toGroup = this.getGroup(this.meta.recycleBinUuid);
        }
        this.move(object, toGroup);
    }
    /**
     * Creates a binary in the db and returns an object that can be put to entry.binaries
     */
    createBinary(value) {
        return this.binaries.add(value);
    }
    /**
     * Import an entry from another file
     * It's up to caller to decide what should happen to the original entry in the source file
     * Returns the new entry
     * @param entry - entry to be imported
     * @param group - target parent group
     * @param file - the source file containing the group
     */
    importEntry(entry, group, file) {
        const newEntry = new kdbx_entry_1.KdbxEntry();
        const uuid = kdbx_uuid_1.KdbxUuid.random();
        newEntry.copyFrom(entry);
        newEntry.uuid = uuid;
        for (const historyEntry of entry.history) {
            const newHistoryEntry = new kdbx_entry_1.KdbxEntry();
            newHistoryEntry.copyFrom(historyEntry);
            newHistoryEntry.uuid = uuid;
            newEntry.history.push(newHistoryEntry);
        }
        const binaries = new Map();
        const customIcons = new Set();
        for (const e of newEntry.history.concat(newEntry)) {
            if (e.customIcon) {
                customIcons.add(e.customIcon.id);
            }
            for (const binary of e.binaries.values()) {
                if (kdbx_binaries_1.KdbxBinaries.isKdbxBinaryWithHash(binary)) {
                    binaries.set(binary.hash, binary);
                }
            }
        }
        for (const binary of binaries.values()) {
            const fileBinary = file.binaries.getValueByHash(binary.hash);
            if (fileBinary && !this.binaries.getValueByHash(binary.hash)) {
                this.binaries.addWithHash(binary);
            }
        }
        for (const customIconId of customIcons) {
            const customIcon = file.meta.customIcons.get(customIconId);
            if (customIcon) {
                this.meta.customIcons.set(customIconId, customIcon);
            }
        }
        group.entries.push(newEntry);
        newEntry.parentGroup = group;
        newEntry.times.update();
        return newEntry;
    }
    /**
     * Perform database cleanup
     * @param settings.historyRules - remove extra history, it it doesn't match defined rules, e.g. records number
     * @param settings.customIcons - remove unused custom icons
     * @param settings.binaries - remove unused binaries
     */
    cleanup(settings) {
        const now = new Date();
        const historyMaxItems = (settings === null || settings === void 0 ? void 0 : settings.historyRules) &&
            typeof this.meta.historyMaxItems === 'number' &&
            this.meta.historyMaxItems >= 0
            ? this.meta.historyMaxItems
            : Infinity;
        const usedCustomIcons = new Set();
        const usedBinaries = new Set();
        const processEntry = (entry) => {
            if (entry.customIcon) {
                usedCustomIcons.add(entry.customIcon.id);
            }
            for (const binary of entry.binaries.values()) {
                if (kdbx_binaries_1.KdbxBinaries.isKdbxBinaryWithHash(binary)) {
                    usedBinaries.add(binary.hash);
                }
            }
        };
        for (const item of this.getDefaultGroup().allGroupsAndEntries()) {
            if (item instanceof kdbx_entry_1.KdbxEntry) {
                if (item.history.length > historyMaxItems) {
                    item.removeHistory(0, item.history.length - historyMaxItems);
                }
                processEntry(item);
                if (item.history) {
                    for (const historyEntry of item.history) {
                        processEntry(historyEntry);
                    }
                }
            }
            else {
                if (item.customIcon) {
                    usedCustomIcons.add(item.customIcon.id);
                }
            }
        }
        if (settings === null || settings === void 0 ? void 0 : settings.customIcons) {
            for (const customIcon of this.meta.customIcons.keys()) {
                if (!usedCustomIcons.has(customIcon)) {
                    const uuid = new kdbx_uuid_1.KdbxUuid(customIcon);
                    this.addDeletedObject(uuid, now);
                    this.meta.customIcons.delete(customIcon);
                }
            }
        }
        if (settings === null || settings === void 0 ? void 0 : settings.binaries) {
            for (const binary of this.binaries.getAllWithHashes()) {
                if (!usedBinaries.has(binary.hash)) {
                    this.binaries.deleteWithHash(binary.hash);
                }
            }
        }
    }
    /**
     * Merge the db with another db
     * Some parts of the remote DB are copied by reference, so it should NOT be modified after merge
     * Suggested use case:
     * - open the local db
     * - get a remote db somehow and open in
     * - merge the remote db into the local db: local.merge(remote)
     * - close the remote db
     * @param remote - database to merge in
     */
    merge(remote) {
        const root = this.getDefaultGroup();
        const remoteRoot = remote.getDefaultGroup();
        if (!root || !remoteRoot) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.MergeError, 'no default group');
        }
        if (!root.uuid.equals(remoteRoot.uuid)) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.MergeError, 'default group is different');
        }
        const objectMap = this.getObjectMap();
        for (const rem of remote.deletedObjects) {
            if (rem.uuid && rem.deletionTime && !objectMap.deleted.has(rem.uuid.id)) {
                this.deletedObjects.push(rem);
                objectMap.deleted.set(rem.uuid.id, rem.deletionTime);
            }
        }
        for (const remoteBinary of remote.binaries.getAllWithHashes()) {
            if (!this.binaries.getValueByHash(remoteBinary.hash)) {
                this.binaries.addWithHash(remoteBinary);
            }
        }
        const remoteObjectMap = remote.getObjectMap();
        objectMap.remoteEntries = remoteObjectMap.entries;
        objectMap.remoteGroups = remoteObjectMap.groups;
        this.meta.merge(remote.meta, objectMap);
        root.merge(objectMap);
        this.cleanup({ historyRules: true, customIcons: true, binaries: true });
    }
    /**
     * Gets editing state tombstones (for successful merge)
     * The replica must save this state with the db, assign in on opening the db,
     * and call removeLocalEditState on successful upstream push.
     * This state is JSON serializable.
     */
    getLocalEditState() {
        const editingState = {
            entries: {}
        };
        for (const entry of this.getDefaultGroup().allEntries()) {
            if (entry._editState && entry.uuid && editingState.entries) {
                editingState.entries[entry.uuid.id] = entry._editState;
            }
        }
        if (this.meta._editState) {
            editingState.meta = this.meta._editState;
        }
        return editingState;
    }
    /**
     * Sets editing state tombstones returned previously by getLocalEditState
     * The replica must call this method on opening the db to the state returned previously on getLocalEditState.
     * @param editingState - result of getLocalEditState invoked before on saving the db
     */
    setLocalEditState(editingState) {
        var _a;
        for (const entry of this.getDefaultGroup().allEntries()) {
            if ((_a = editingState.entries) === null || _a === void 0 ? void 0 : _a[entry.uuid.id]) {
                entry._editState = editingState.entries[entry.uuid.id];
            }
        }
        if (editingState.meta) {
            this.meta._editState = editingState.meta;
        }
    }
    /**
     * Removes editing state tombstones
     * Immediately after successful upstream push the replica must:
     * - call this method
     * - discard any previous state obtained by getLocalEditState call before
     */
    removeLocalEditState() {
        for (const entry of this.getDefaultGroup().allEntries()) {
            entry._editState = undefined;
        }
        this.meta._editState = undefined;
    }
    /**
     * Upgrade the file to latest version
     */
    upgrade() {
        this.setVersion(kdbx_header_1.KdbxHeader.MaxFileVersion);
    }
    /**
     * Set the file version to a specified number
     */
    setVersion(version) {
        this.meta.headerHash = undefined;
        this.meta.settingsChanged = new Date();
        this.header.setVersion(version);
    }
    /**
     * Set file key derivation function
     * @param kdf - KDF id, from KdfId
     */
    setKdf(kdf) {
        this.meta.headerHash = undefined;
        this.meta.settingsChanged = new Date();
        this.header.setKdf(kdf);
    }
    getObjectMap() {
        const objectMap = {
            entries: new Map(),
            groups: new Map(),
            remoteEntries: new Map(),
            remoteGroups: new Map(),
            deleted: new Map()
        };
        for (const item of this.getDefaultGroup().allGroupsAndEntries()) {
            if (objectMap.entries.has(item.uuid.id)) {
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.MergeError, `duplicate: ${item.uuid}`);
            }
            if (item instanceof kdbx_entry_1.KdbxEntry) {
                objectMap.entries.set(item.uuid.id, item);
            }
            else {
                objectMap.groups.set(item.uuid.id, item);
            }
        }
        for (const deletedObject of this.deletedObjects) {
            if (deletedObject.uuid && deletedObject.deletionTime) {
                objectMap.deleted.set(deletedObject.uuid.id, deletedObject.deletionTime);
            }
        }
        return objectMap;
    }
    loadFromXml(ctx) {
        if (!this.xml) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'xml is not set');
        }
        const doc = this.xml.documentElement;
        if (doc.tagName !== XmlNames.Elem.DocNode) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad xml root');
        }
        this.parseMeta(ctx);
        return this.binaries.computeHashes().then(() => {
            this.parseRoot(ctx);
            return this;
        });
    }
    parseMeta(ctx) {
        if (!this.xml) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'xml is not set');
        }
        const node = XmlUtils.getChildNode(this.xml.documentElement, XmlNames.Elem.Meta, 'no meta node');
        this.meta = kdbx_meta_1.KdbxMeta.read(node, ctx);
    }
    parseRoot(ctx) {
        if (!this.xml) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidState, 'xml is not set');
        }
        this.groups = [];
        this.deletedObjects = [];
        const node = XmlUtils.getChildNode(this.xml.documentElement, XmlNames.Elem.Root, 'no root node');
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            switch (childNode.tagName) {
                case XmlNames.Elem.Group:
                    this.readGroup(childNode, ctx);
                    break;
                case XmlNames.Elem.DeletedObjects:
                    this.readDeletedObjects(childNode);
                    break;
            }
        }
    }
    readDeletedObjects(node) {
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            const childNode = cn[i];
            switch (childNode.tagName) {
                case XmlNames.Elem.DeletedObject:
                    this.deletedObjects.push(kdbx_deleted_object_1.KdbxDeletedObject.read(childNode));
                    break;
            }
        }
    }
    readGroup(node, ctx) {
        this.groups.push(kdbx_group_1.KdbxGroup.read(node, ctx));
    }
    buildXml(ctx) {
        const xml = XmlUtils.create(XmlNames.Elem.DocNode);
        this.meta.write(xml.documentElement, ctx);
        const rootNode = XmlUtils.addChildNode(xml.documentElement, XmlNames.Elem.Root);
        for (const g of this.groups) {
            g.write(rootNode, ctx);
        }
        const delObjNode = XmlUtils.addChildNode(rootNode, XmlNames.Elem.DeletedObjects);
        for (const d of this.deletedObjects) {
            d.write(delObjNode, ctx);
        }
        this.xml = xml;
    }
    versionIsAtLeast(major, minor) {
        return (this.versionMajor > major || (this.versionMajor === major && this.versionMinor >= minor));
    }
}
exports.Kdbx = Kdbx;


/***/ }),

/***/ "./utils/binary-stream.ts":
/*!********************************!*\
  !*** ./utils/binary-stream.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BinaryStream = void 0;
class BinaryStream {
    constructor(arrayBuffer) {
        this._arrayBuffer = arrayBuffer || new ArrayBuffer(1024);
        this._dataView = new DataView(this._arrayBuffer);
        this._pos = 0;
        this._canExpand = !arrayBuffer;
    }
    get pos() {
        return this._pos;
    }
    get byteLength() {
        return this._arrayBuffer.byteLength;
    }
    readBytes(size) {
        const buffer = this._arrayBuffer.slice(this._pos, this._pos + size);
        this._pos += size;
        return buffer;
    }
    readBytesToEnd() {
        const size = this._arrayBuffer.byteLength - this._pos;
        return this.readBytes(size);
    }
    readBytesNoAdvance(startPos, endPos) {
        return this._arrayBuffer.slice(startPos, endPos);
    }
    writeBytes(bytes) {
        const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
        this.checkCapacity(arr.length);
        new Uint8Array(this._arrayBuffer).set(arr, this._pos);
        this._pos += arr.length;
    }
    getWrittenBytes() {
        return this._arrayBuffer.slice(0, this._pos);
    }
    checkCapacity(addBytes) {
        const available = this._arrayBuffer.byteLength - this._pos;
        if (this._canExpand && available < addBytes) {
            let newLen = this._arrayBuffer.byteLength;
            const requestedLen = this._pos + addBytes;
            while (newLen < requestedLen) {
                newLen *= 2;
            }
            const newData = new Uint8Array(newLen);
            newData.set(new Uint8Array(this._arrayBuffer));
            this._arrayBuffer = newData.buffer;
            this._dataView = new DataView(this._arrayBuffer);
        }
    }
    getInt8() {
        const value = this._dataView.getInt8(this._pos);
        this._pos += 1;
        return value;
    }
    setInt8(value) {
        this.checkCapacity(1);
        this._dataView.setInt8(this._pos, value);
        this._pos += 1;
    }
    getUint8() {
        const value = this._dataView.getUint8(this._pos);
        this._pos += 1;
        return value;
    }
    setUint8(value) {
        this.checkCapacity(1);
        this._dataView.setUint8(this._pos, value);
        this._pos += 1;
    }
    getInt16(littleEndian) {
        const value = this._dataView.getInt16(this._pos, littleEndian);
        this._pos += 2;
        return value;
    }
    setInt16(value, littleEndian) {
        this.checkCapacity(2);
        this._dataView.setInt16(this._pos, value, littleEndian);
        this._pos += 2;
    }
    getUint16(littleEndian) {
        const value = this._dataView.getUint16(this._pos, littleEndian);
        this._pos += 2;
        return value;
    }
    setUint16(value, littleEndian) {
        this.checkCapacity(2);
        this._dataView.setUint16(this._pos, value, littleEndian);
        this._pos += 2;
    }
    getInt32(littleEndian) {
        const value = this._dataView.getInt32(this._pos, littleEndian);
        this._pos += 4;
        return value;
    }
    setInt32(value, littleEndian) {
        this.checkCapacity(4);
        this._dataView.setInt32(this._pos, value, littleEndian);
        this._pos += 4;
    }
    getUint32(littleEndian) {
        const value = this._dataView.getUint32(this._pos, littleEndian);
        this._pos += 4;
        return value;
    }
    setUint32(value, littleEndian) {
        this.checkCapacity(4);
        this._dataView.setUint32(this._pos, value, littleEndian);
        this._pos += 4;
    }
    getFloat32(littleEndian) {
        const value = this._dataView.getFloat32(this._pos, littleEndian);
        this._pos += 4;
        return value;
    }
    setFloat32(value, littleEndian) {
        this.checkCapacity(4);
        this._dataView.setFloat32(this._pos, value, littleEndian);
        this._pos += 4;
    }
    getFloat64(littleEndian) {
        const value = this._dataView.getFloat64(this._pos, littleEndian);
        this._pos += 8;
        return value;
    }
    setFloat64(value, littleEndian) {
        this.checkCapacity(8);
        this._dataView.setFloat64(this._pos, value, littleEndian);
        this._pos += 8;
    }
    getUint64(littleEndian) {
        let part1 = this.getUint32(littleEndian), part2 = this.getUint32(littleEndian);
        if (littleEndian) {
            part2 *= 0x100000000;
        }
        else {
            part1 *= 0x100000000;
        }
        return part1 + part2;
    }
    setUint64(value, littleEndian) {
        if (littleEndian) {
            this.setUint32(value & 0xffffffff, true);
            this.setUint32(Math.floor(value / 0x100000000), true);
        }
        else {
            this.checkCapacity(8);
            this.setUint32(Math.floor(value / 0x100000000), false);
            this.setUint32(value & 0xffffffff, false);
        }
    }
}
exports.BinaryStream = BinaryStream;


/***/ }),

/***/ "./utils/byte-utils.ts":
/*!*****************************!*\
  !*** ./utils/byte-utils.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.zeroBuffer = exports.arrayToBuffer = exports.bytesToHex = exports.hexToBytes = exports.bytesToBase64 = exports.base64ToBytes = exports.stringToBytes = exports.bytesToString = exports.arrayBufferEquals = void 0;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
function arrayBufferEquals(ab1, ab2) {
    if (ab1.byteLength !== ab2.byteLength) {
        return false;
    }
    const arr1 = new Uint8Array(ab1);
    const arr2 = new Uint8Array(ab2);
    for (let i = 0, len = arr1.length; i < len; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}
exports.arrayBufferEquals = arrayBufferEquals;
function bytesToString(arr) {
    if (arr instanceof ArrayBuffer) {
        arr = new Uint8Array(arr);
    }
    return textDecoder.decode(arr);
}
exports.bytesToString = bytesToString;
function stringToBytes(str) {
    return textEncoder.encode(str);
}
exports.stringToBytes = stringToBytes;
function base64ToBytes(str) {
    if (typeof atob === 'function') {
        const byteStr = atob(str);
        const arr = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) {
            arr[i] = byteStr.charCodeAt(i);
        }
        return arr;
    }
    else {
        const buffer = Buffer.from(str, 'base64');
        return new Uint8Array(buffer);
    }
}
exports.base64ToBytes = base64ToBytes;
function bytesToBase64(arr) {
    const intArr = arr instanceof ArrayBuffer ? new Uint8Array(arr) : arr;
    if (typeof btoa === 'function') {
        let str = '';
        for (let i = 0; i < intArr.length; i++) {
            str += String.fromCharCode(intArr[i]);
        }
        return btoa(str);
    }
    else {
        const buffer = Buffer.from(arr);
        return buffer.toString('base64');
    }
}
exports.bytesToBase64 = bytesToBase64;
function hexToBytes(hex) {
    const arr = new Uint8Array(Math.ceil(hex.length / 2));
    for (let i = 0; i < arr.length; i++) {
        arr[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return arr;
}
exports.hexToBytes = hexToBytes;
function bytesToHex(arr) {
    const intArr = arr instanceof ArrayBuffer ? new Uint8Array(arr) : arr;
    let str = '';
    for (let i = 0; i < intArr.length; i++) {
        const byte = intArr[i].toString(16);
        if (byte.length === 1) {
            str += '0';
        }
        str += byte;
    }
    return str;
}
exports.bytesToHex = bytesToHex;
function arrayToBuffer(arr) {
    if (arr instanceof ArrayBuffer) {
        return arr;
    }
    const ab = arr.buffer;
    if (arr.byteOffset === 0 && arr.byteLength === ab.byteLength) {
        return ab;
    }
    return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
}
exports.arrayToBuffer = arrayToBuffer;
function zeroBuffer(arr) {
    const intArr = arr instanceof ArrayBuffer ? new Uint8Array(arr) : arr;
    intArr.fill(0);
}
exports.zeroBuffer = zeroBuffer;


/***/ }),

/***/ "./utils/int64.ts":
/*!************************!*\
  !*** ./utils/int64.ts ***!
  \************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Int64 = void 0;
class Int64 {
    constructor(lo = 0, hi = 0) {
        this.lo = lo;
        this.hi = hi;
    }
    get value() {
        if (this.hi) {
            if (this.hi >= 0x200000) {
                throw new Error('too large number');
            }
            return this.hi * 0x100000000 + this.lo;
        }
        return this.lo;
    }
    valueOf() {
        return this.value;
    }
    static from(value) {
        if (value > 0x1fffffffffffff) {
            throw new Error('too large number');
        }
        const lo = value >>> 0;
        const hi = ((value - lo) / 0x100000000) >>> 0;
        return new Int64(lo, hi);
    }
}
exports.Int64 = Int64;


/***/ }),

/***/ "./utils/var-dictionary.ts":
/*!*********************************!*\
  !*** ./utils/var-dictionary.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.VarDictionary = exports.ValueType = void 0;
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const byte_utils_1 = __webpack_require__(/*! ./byte-utils */ "./utils/byte-utils.ts");
const int64_1 = __webpack_require__(/*! ./int64 */ "./utils/int64.ts");
const MaxSupportedVersion = 1;
const DefaultVersion = 0x0100;
var ValueType;
(function (ValueType) {
    ValueType[ValueType["UInt32"] = 4] = "UInt32";
    ValueType[ValueType["UInt64"] = 5] = "UInt64";
    ValueType[ValueType["Bool"] = 8] = "Bool";
    ValueType[ValueType["Int32"] = 12] = "Int32";
    ValueType[ValueType["Int64"] = 13] = "Int64";
    ValueType[ValueType["String"] = 24] = "String";
    ValueType[ValueType["Bytes"] = 66] = "Bytes";
})(ValueType = exports.ValueType || (exports.ValueType = {}));
class VarDictionary {
    constructor() {
        this._items = [];
        this._map = new Map();
    }
    keys() {
        return this._items.map((item) => item.key);
    }
    get length() {
        return this._items.length;
    }
    get(key) {
        const item = this._map.get(key);
        return item ? item.value : undefined;
    }
    set(key, type, value) {
        let item;
        switch (type) {
            case ValueType.UInt32:
                if (typeof value !== 'number' || value < 0) {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg);
                }
                item = { key, type, value };
                break;
            case ValueType.UInt64:
                if (!(value instanceof int64_1.Int64)) {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg);
                }
                item = { key, type, value };
                break;
            case ValueType.Bool:
                if (typeof value !== 'boolean') {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg);
                }
                item = { key, type, value };
                break;
            case ValueType.Int32:
                if (typeof value !== 'number') {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg);
                }
                item = { key, type, value };
                break;
            case ValueType.Int64:
                if (!(value instanceof int64_1.Int64)) {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg);
                }
                item = { key, type, value };
                break;
            case ValueType.String:
                if (typeof value !== 'string') {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg);
                }
                item = { key, type, value };
                break;
            case ValueType.Bytes:
                if (value instanceof Uint8Array) {
                    value = (0, byte_utils_1.arrayToBuffer)(value);
                }
                if (!(value instanceof ArrayBuffer)) {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg);
                }
                item = { key, type, value };
                break;
            default:
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidArg);
        }
        const existing = this._map.get(key);
        if (existing) {
            const ix = this._items.indexOf(existing);
            this._items.splice(ix, 1, item);
        }
        else {
            this._items.push(item);
        }
        this._map.set(key, item);
    }
    remove(key) {
        this._items = this._items.filter((item) => {
            return item.key !== key;
        });
        this._map.delete(key);
    }
    static read(stm) {
        const dict = new VarDictionary();
        dict.readVersion(stm);
        for (let item; (item = dict.readItem(stm));) {
            dict._items.push(item);
            dict._map.set(item.key, item);
        }
        return dict;
    }
    readVersion(stm) {
        stm.getUint8();
        const versionMajor = stm.getUint8();
        if (versionMajor === 0 || versionMajor > MaxSupportedVersion) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.InvalidVersion);
        }
    }
    readItem(stm) {
        const type = stm.getUint8();
        if (!type) {
            return undefined;
        }
        const keyLength = stm.getInt32(true);
        if (keyLength <= 0) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad key length');
        }
        const key = (0, byte_utils_1.bytesToString)(stm.readBytes(keyLength));
        const valueLength = stm.getInt32(true);
        if (valueLength < 0) {
            throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad value length');
        }
        switch (type) {
            case ValueType.UInt32: {
                if (valueLength !== 4) {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad uint32');
                }
                const value = stm.getUint32(true);
                return { key, type, value };
            }
            case ValueType.UInt64: {
                if (valueLength !== 8) {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad uint64');
                }
                const loInt = stm.getUint32(true);
                const hiInt = stm.getUint32(true);
                const value = new int64_1.Int64(loInt, hiInt);
                return { key, type, value };
            }
            case ValueType.Bool: {
                if (valueLength !== 1) {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad bool');
                }
                const value = stm.getUint8() !== 0;
                return { key, type, value };
            }
            case ValueType.Int32: {
                if (valueLength !== 4) {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad int32');
                }
                const value = stm.getInt32(true);
                return { key, type, value };
            }
            case ValueType.Int64: {
                if (valueLength !== 8) {
                    throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad int64');
                }
                const loUint = stm.getUint32(true);
                const hiUint = stm.getUint32(true);
                const value = new int64_1.Int64(loUint, hiUint);
                return { key, type, value };
            }
            case ValueType.String: {
                const value = (0, byte_utils_1.bytesToString)(stm.readBytes(valueLength));
                return { key, type, value };
            }
            case ValueType.Bytes: {
                const value = stm.readBytes(valueLength);
                return { key, type, value };
            }
            default:
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, `bad value type: ${type}`);
        }
    }
    write(stm) {
        this.writeVersion(stm);
        for (const item of this._items) {
            this.writeItem(stm, item);
        }
        stm.setUint8(0);
    }
    writeVersion(stm) {
        stm.setUint16(DefaultVersion, true);
    }
    writeItem(stm, item) {
        stm.setUint8(item.type);
        const keyBytes = (0, byte_utils_1.stringToBytes)(item.key);
        stm.setInt32(keyBytes.length, true);
        stm.writeBytes(keyBytes);
        switch (item.type) {
            case ValueType.UInt32:
                stm.setInt32(4, true);
                stm.setUint32(item.value, true);
                break;
            case ValueType.UInt64:
                stm.setInt32(8, true);
                stm.setUint32(item.value.lo, true);
                stm.setUint32(item.value.hi, true);
                break;
            case ValueType.Bool:
                stm.setInt32(1, true);
                stm.setUint8(item.value ? 1 : 0);
                break;
            case ValueType.Int32:
                stm.setInt32(4, true);
                stm.setInt32(item.value, true);
                break;
            case ValueType.Int64:
                stm.setInt32(8, true);
                stm.setUint32(item.value.lo, true);
                stm.setUint32(item.value.hi, true);
                break;
            case ValueType.String: {
                const strBytes = (0, byte_utils_1.stringToBytes)(item.value);
                stm.setInt32(strBytes.length, true);
                stm.writeBytes(strBytes);
                break;
            }
            case ValueType.Bytes: {
                const bytesBuffer = (0, byte_utils_1.arrayToBuffer)(item.value);
                stm.setInt32(bytesBuffer.byteLength, true);
                stm.writeBytes(bytesBuffer);
                break;
            }
            default:
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.Unsupported);
        }
    }
}
exports.VarDictionary = VarDictionary;
VarDictionary.ValueType = ValueType;


/***/ }),

/***/ "./utils/xml-utils.ts":
/*!****************************!*\
  !*** ./utils/xml-utils.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.protectPlainValues = exports.protectUnprotectedValues = exports.unprotectValues = exports.updateProtectedValuesSalt = exports.setProtectedValues = exports.traverse = exports.setProtectedBinary = exports.getProtectedBinary = exports.setProtectedText = exports.getProtectedText = exports.setUuid = exports.getUuid = exports.strToBoolean = exports.setBoolean = exports.getBoolean = exports.setNumber = exports.getNumber = exports.setDate = exports.getDate = exports.setBytes = exports.getBytes = exports.setTags = exports.getTags = exports.setText = exports.getText = exports.addChildNode = exports.getChildNode = exports.create = exports.serialize = exports.parse = void 0;
const fflate_1 = __webpack_require__(/*! fflate */ "../node_modules/fflate/lib/index.cjs");
const kdbx_error_1 = __webpack_require__(/*! ../errors/kdbx-error */ "./errors/kdbx-error.ts");
const consts_1 = __webpack_require__(/*! ../defs/consts */ "./defs/consts.ts");
const XmlNames = __webpack_require__(/*! ../defs/xml-names */ "./defs/xml-names.ts");
const byte_utils_1 = __webpack_require__(/*! ./byte-utils */ "./utils/byte-utils.ts");
const int64_1 = __webpack_require__(/*! ./int64 */ "./utils/int64.ts");
const kdbx_uuid_1 = __webpack_require__(/*! ../format/kdbx-uuid */ "./format/kdbx-uuid.ts");
const protected_value_1 = __webpack_require__(/*! ../crypto/protected-value */ "./crypto/protected-value.ts");
const kdbx_binaries_1 = __webpack_require__(/*! ../format/kdbx-binaries */ "./format/kdbx-binaries.ts");
const DateRegex = /\.\d\d\d/;
const EpochSeconds = 62135596800;
const TagsSplitRegex = /\s*[;,:]\s*/;
function createDOMParser() {
    if (__webpack_require__.g.DOMParser) {
        return new __webpack_require__.g.DOMParser();
    }
    const parserArg = {
        errorHandler: {
            warning: (e) => {
                throw e;
            },
            error: (e) => {
                throw e;
            },
            fatalError: (e) => {
                throw e;
            }
        }
    };
    /* eslint-disable @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call */
    const { DOMParser } = __webpack_require__(/*! @xmldom/xmldom */ "@xmldom/xmldom");
    return new DOMParser(parserArg);
    /* eslint-enable */
}
function createXMLSerializer() {
    if (__webpack_require__.g.XMLSerializer) {
        return new __webpack_require__.g.XMLSerializer();
    }
    /* eslint-disable @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call */
    const { XMLSerializer } = __webpack_require__(/*! @xmldom/xmldom */ "@xmldom/xmldom");
    return new XMLSerializer();
    /* eslint-enable */
}
function parse(xml) {
    const parser = createDOMParser();
    let doc;
    // eslint-disable-next-line no-control-regex
    xml = xml.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]/g, '');
    try {
        doc = parser.parseFromString(xml, 'application/xml');
    }
    catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, `bad xml: ${errMsg}`);
    }
    if (!doc.documentElement) {
        throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, 'bad xml');
    }
    const parserError = doc.getElementsByTagName('parsererror')[0];
    if (parserError) {
        throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, `bad xml: ${parserError.textContent}`);
    }
    return doc;
}
exports.parse = parse;
function serialize(doc, prettyPrint = false) {
    if (prettyPrint) {
        prettyPrintXmlNode(doc, 0);
    }
    let xml = createXMLSerializer().serializeToString(doc);
    if (prettyPrint && xml.startsWith('<?')) {
        xml = xml.replace(/^(<\?.*?\?>)</, '$1\n<');
    }
    return xml;
}
exports.serialize = serialize;
function prettyPrintXmlNode(node, indentationLevel) {
    const numChildNodes = node.childNodes.length;
    if (numChildNodes === 0) {
        return;
    }
    const formatStr = '\n' + '    '.repeat(indentationLevel);
    const prevFormatStr = indentationLevel > 0 ? '\n' + '    '.repeat(indentationLevel - 1) : '';
    const doc = node.ownerDocument || node;
    const childNodes = [];
    let childNode;
    for (let i = 0; i < numChildNodes; i++) {
        childNode = node.childNodes[i];
        if (childNode.nodeType !== doc.TEXT_NODE &&
            childNode.nodeType !== doc.PROCESSING_INSTRUCTION_NODE) {
            childNodes.push(childNode);
        }
    }
    for (let j = 0; j < childNodes.length; j++) {
        childNode = childNodes[j];
        const isFirstDocumentNode = indentationLevel === 0 && j === 0;
        if (!isFirstDocumentNode) {
            const textNodeBefore = doc.createTextNode(formatStr);
            node.insertBefore(textNodeBefore, childNode);
        }
        if (!childNode.nextSibling && indentationLevel > 0) {
            const textNodeAfter = doc.createTextNode(prevFormatStr);
            node.appendChild(textNodeAfter);
        }
        prettyPrintXmlNode(childNode, indentationLevel + 1);
    }
}
function create(rootNode) {
    return parse('<?xml version="1.0" encoding="utf-8" standalone="yes"?><' + rootNode + '/>');
}
exports.create = create;
function getChildNode(node, tagName, errorMsgIfAbsent) {
    if (node && node.childNodes) {
        for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
            if (cn[i].tagName === tagName) {
                return cn[i];
            }
        }
    }
    if (errorMsgIfAbsent) {
        throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, errorMsgIfAbsent);
    }
    else {
        return null;
    }
}
exports.getChildNode = getChildNode;
function addChildNode(node, tagName) {
    return node.appendChild((node.ownerDocument || node).createElement(tagName));
}
exports.addChildNode = addChildNode;
function getText(node) {
    var _a;
    if (!(node === null || node === void 0 ? void 0 : node.childNodes)) {
        return undefined;
    }
    return node.protectedValue ? node.protectedValue.getText() : (_a = node.textContent) !== null && _a !== void 0 ? _a : undefined;
}
exports.getText = getText;
function setText(node, text) {
    node.textContent = text || '';
}
exports.setText = setText;
function getTags(node) {
    const text = getText(node);
    if (!text) {
        return [];
    }
    return text
        .split(TagsSplitRegex)
        .map((t) => t.trim())
        .filter((s) => s);
}
exports.getTags = getTags;
function setTags(node, tags) {
    setText(node, tags.join(', '));
}
exports.setTags = setTags;
function getBytes(node) {
    const text = getText(node);
    return text ? (0, byte_utils_1.arrayToBuffer)((0, byte_utils_1.base64ToBytes)(text)) : undefined;
}
exports.getBytes = getBytes;
function setBytes(node, bytes) {
    if (typeof bytes === 'string') {
        bytes = (0, byte_utils_1.base64ToBytes)(bytes);
    }
    setText(node, bytes ? (0, byte_utils_1.bytesToBase64)((0, byte_utils_1.arrayToBuffer)(bytes)) : undefined);
}
exports.setBytes = setBytes;
function getDate(node) {
    const text = getText(node);
    if (!text) {
        return undefined;
    }
    if (text.indexOf(':') > 0) {
        return new Date(text);
    }
    const bytes = new DataView((0, byte_utils_1.arrayToBuffer)((0, byte_utils_1.base64ToBytes)(text)));
    const secondsFrom00 = new int64_1.Int64(bytes.getUint32(0, true), bytes.getUint32(4, true)).value;
    const diff = (secondsFrom00 - EpochSeconds) * 1000;
    return new Date(diff);
}
exports.getDate = getDate;
function setDate(node, date, binary = false) {
    if (date) {
        if (binary) {
            const secondsFrom00 = Math.floor(date.getTime() / 1000) + EpochSeconds;
            const bytes = new DataView(new ArrayBuffer(8));
            const val64 = int64_1.Int64.from(secondsFrom00);
            bytes.setUint32(0, val64.lo, true);
            bytes.setUint32(4, val64.hi, true);
            setText(node, (0, byte_utils_1.bytesToBase64)(bytes.buffer));
        }
        else {
            setText(node, date.toISOString().replace(DateRegex, ''));
        }
    }
    else {
        setText(node, '');
    }
}
exports.setDate = setDate;
function getNumber(node) {
    const text = getText(node);
    return text ? +text : undefined;
}
exports.getNumber = getNumber;
function setNumber(node, number) {
    setText(node, typeof number === 'number' && !isNaN(number) ? number.toString() : undefined);
}
exports.setNumber = setNumber;
function getBoolean(node) {
    const text = getText(node);
    return text ? strToBoolean(text) : undefined;
}
exports.getBoolean = getBoolean;
function setBoolean(node, boolean) {
    setText(node, boolean === undefined ? '' : boolean === null ? 'null' : boolean ? 'True' : 'False');
}
exports.setBoolean = setBoolean;
function strToBoolean(str) {
    switch (str === null || str === void 0 ? void 0 : str.toLowerCase()) {
        case 'true':
            return true;
        case 'false':
            return false;
        case 'null':
            return null;
    }
    return undefined;
}
exports.strToBoolean = strToBoolean;
function getUuid(node) {
    const bytes = getBytes(node);
    return bytes ? new kdbx_uuid_1.KdbxUuid(bytes) : undefined;
}
exports.getUuid = getUuid;
function setUuid(node, uuid) {
    const uuidBytes = uuid instanceof kdbx_uuid_1.KdbxUuid ? uuid.toBytes() : uuid;
    setBytes(node, uuidBytes);
}
exports.setUuid = setUuid;
function getProtectedText(node) {
    var _a;
    return (_a = (node.protectedValue || node.textContent)) !== null && _a !== void 0 ? _a : undefined;
}
exports.getProtectedText = getProtectedText;
function setProtectedText(node, text) {
    if (text instanceof protected_value_1.ProtectedValue) {
        node.protectedValue = text;
        node.setAttribute(XmlNames.Attr.Protected, 'True');
    }
    else {
        setText(node, text);
    }
}
exports.setProtectedText = setProtectedText;
function getProtectedBinary(node) {
    if (node.protectedValue) {
        return node.protectedValue;
    }
    const text = node.textContent;
    const ref = node.getAttribute(XmlNames.Attr.Ref);
    if (ref) {
        return { ref };
    }
    if (!text) {
        return undefined;
    }
    const compressed = strToBoolean(node.getAttribute(XmlNames.Attr.Compressed));
    let bytes = (0, byte_utils_1.base64ToBytes)(text);
    if (compressed) {
        bytes = (0, fflate_1.gunzipSync)(bytes);
    }
    return (0, byte_utils_1.arrayToBuffer)(bytes);
}
exports.getProtectedBinary = getProtectedBinary;
function setProtectedBinary(node, binary) {
    if (binary instanceof protected_value_1.ProtectedValue) {
        node.protectedValue = binary;
        node.setAttribute(XmlNames.Attr.Protected, 'True');
    }
    else if (kdbx_binaries_1.KdbxBinaries.isKdbxBinaryRef(binary)) {
        node.setAttribute(XmlNames.Attr.Ref, binary.ref);
    }
    else {
        setBytes(node, binary);
    }
}
exports.setProtectedBinary = setProtectedBinary;
function traverse(node, callback) {
    callback(node);
    for (let i = 0, cn = node.childNodes, len = cn.length; i < len; i++) {
        const childNode = cn[i];
        if (childNode.tagName) {
            traverse(childNode, callback);
        }
    }
}
exports.traverse = traverse;
function setProtectedValues(node, protectSaltGenerator) {
    traverse(node, (node) => {
        if (strToBoolean(node.getAttribute(XmlNames.Attr.Protected))) {
            try {
                const value = (0, byte_utils_1.arrayToBuffer)((0, byte_utils_1.base64ToBytes)(node.textContent || ''));
                if (value.byteLength) {
                    const salt = protectSaltGenerator.getSalt(value.byteLength);
                    node.protectedValue = new protected_value_1.ProtectedValue(value, salt);
                }
            }
            catch (e) {
                throw new kdbx_error_1.KdbxError(consts_1.ErrorCodes.FileCorrupt, `bad protected value at line ${node.lineNumber}: ${e}`);
            }
        }
    });
}
exports.setProtectedValues = setProtectedValues;
function updateProtectedValuesSalt(node, protectSaltGenerator) {
    traverse(node, (node) => {
        if (strToBoolean(node.getAttribute(XmlNames.Attr.Protected)) && node.protectedValue) {
            const newSalt = protectSaltGenerator.getSalt(node.protectedValue.byteLength);
            node.protectedValue.setSalt(newSalt);
            node.textContent = node.protectedValue.toString();
        }
    });
}
exports.updateProtectedValuesSalt = updateProtectedValuesSalt;
function unprotectValues(node) {
    traverse(node, (node) => {
        if (strToBoolean(node.getAttribute(XmlNames.Attr.Protected)) && node.protectedValue) {
            node.removeAttribute(XmlNames.Attr.Protected);
            node.setAttribute(XmlNames.Attr.ProtectedInMemPlainXml, 'True');
            node.textContent = node.protectedValue.getText();
        }
    });
}
exports.unprotectValues = unprotectValues;
function protectUnprotectedValues(node) {
    traverse(node, (node) => {
        if (strToBoolean(node.getAttribute(XmlNames.Attr.ProtectedInMemPlainXml)) &&
            node.protectedValue) {
            node.removeAttribute(XmlNames.Attr.ProtectedInMemPlainXml);
            node.setAttribute(XmlNames.Attr.Protected, 'True');
            node.textContent = node.protectedValue.toString();
        }
    });
}
exports.protectUnprotectedValues = protectUnprotectedValues;
function protectPlainValues(node) {
    traverse(node, (node) => {
        if (strToBoolean(node.getAttribute(XmlNames.Attr.ProtectedInMemPlainXml))) {
            node.protectedValue = protected_value_1.ProtectedValue.fromString(node.textContent || '');
            node.textContent = node.protectedValue.toString();
            node.removeAttribute(XmlNames.Attr.ProtectedInMemPlainXml);
            node.setAttribute(XmlNames.Attr.Protected, 'True');
        }
    });
}
exports.protectPlainValues = protectPlainValues;


/***/ }),

/***/ "@xmldom/xmldom":
/*!*********************************!*\
  !*** external "@xmldom/xmldom" ***!
  \*********************************/
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE__xmldom_xmldom__;

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE_crypto__;

/***/ }),

/***/ "../node_modules/fflate/lib/index.cjs":
/*!********************************************!*\
  !*** ../node_modules/fflate/lib/index.cjs ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// DEFLATE is a complex format; to read this code, you should probably check the RFC first:
// https://tools.ietf.org/html/rfc1951
// You may also wish to take a look at the guide I made about this program:
// https://gist.github.com/101arrowz/253f31eb5abc3d9275ab943003ffecad
// Some of the following code is similar to that of UZIP.js:
// https://github.com/photopea/UZIP.js
// However, the vast majority of the codebase has diverged from UZIP.js to increase performance and reduce bundle size.
// Sometimes 0 will appear where -1 would be more appropriate. This is because using a uint
// is better for memory in most engines (I *think*).
var node_worker_1 = __webpack_require__(/*! ./node-worker.cjs */ "../node_modules/fflate/lib/worker.cjs");
// aliases for shorter compressed code (most minifers don't do this)
var u8 = Uint8Array, u16 = Uint16Array, u32 = Uint32Array;
// fixed length extra bits
var fleb = new u8([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, /* unused */ 0, 0, /* impossible */ 0]);
// fixed distance extra bits
// see fleb note
var fdeb = new u8([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, /* unused */ 0, 0]);
// code length index map
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
// get base, reverse index map from extra bits
var freb = function (eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
        b[i] = start += 1 << eb[i - 1];
    }
    // numbers here are at max 18 bits
    var r = new u32(b[30]);
    for (var i = 1; i < 30; ++i) {
        for (var j = b[i]; j < b[i + 1]; ++j) {
            r[j] = ((j - b[i]) << 5) | i;
        }
    }
    return [b, r];
};
var _a = freb(fleb, 2), fl = _a[0], revfl = _a[1];
// we can ignore the fact that the other numbers are wrong; they never happen anyway
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0), fd = _b[0], revfd = _b[1];
// map of value to reverse (assuming 16 bits)
var rev = new u16(32768);
for (var i = 0; i < 32768; ++i) {
    // reverse table algorithm from SO
    var x = ((i & 0xAAAA) >>> 1) | ((i & 0x5555) << 1);
    x = ((x & 0xCCCC) >>> 2) | ((x & 0x3333) << 2);
    x = ((x & 0xF0F0) >>> 4) | ((x & 0x0F0F) << 4);
    rev[i] = (((x & 0xFF00) >>> 8) | ((x & 0x00FF) << 8)) >>> 1;
}
// create huffman tree from u8 "map": index -> code length for code index
// mb (max bits) must be at most 15
// TODO: optimize/split up?
var hMap = (function (cd, mb, r) {
    var s = cd.length;
    // index
    var i = 0;
    // u16 "map": index -> # of codes with bit length = index
    var l = new u16(mb);
    // length of cd must be 288 (total # of codes)
    for (; i < s; ++i)
        ++l[cd[i] - 1];
    // u16 "map": index -> minimum code for bit length = index
    var le = new u16(mb);
    for (i = 0; i < mb; ++i) {
        le[i] = (le[i - 1] + l[i - 1]) << 1;
    }
    var co;
    if (r) {
        // u16 "map": index -> number of actual bits, symbol for code
        co = new u16(1 << mb);
        // bits to remove for reverser
        var rvb = 15 - mb;
        for (i = 0; i < s; ++i) {
            // ignore 0 lengths
            if (cd[i]) {
                // num encoding both symbol and bits read
                var sv = (i << 4) | cd[i];
                // free bits
                var r_1 = mb - cd[i];
                // start value
                var v = le[cd[i] - 1]++ << r_1;
                // m is end value
                for (var m = v | ((1 << r_1) - 1); v <= m; ++v) {
                    // every 16 bit value starting with the code yields the same result
                    co[rev[v] >>> rvb] = sv;
                }
            }
        }
    }
    else {
        co = new u16(s);
        for (i = 0; i < s; ++i) {
            if (cd[i]) {
                co[i] = rev[le[cd[i] - 1]++] >>> (15 - cd[i]);
            }
        }
    }
    return co;
});
// fixed length tree
var flt = new u8(288);
for (var i = 0; i < 144; ++i)
    flt[i] = 8;
for (var i = 144; i < 256; ++i)
    flt[i] = 9;
for (var i = 256; i < 280; ++i)
    flt[i] = 7;
for (var i = 280; i < 288; ++i)
    flt[i] = 8;
// fixed distance tree
var fdt = new u8(32);
for (var i = 0; i < 32; ++i)
    fdt[i] = 5;
// fixed length map
var flm = /*#__PURE__*/ hMap(flt, 9, 0), flrm = /*#__PURE__*/ hMap(flt, 9, 1);
// fixed distance map
var fdm = /*#__PURE__*/ hMap(fdt, 5, 0), fdrm = /*#__PURE__*/ hMap(fdt, 5, 1);
// find max of array
var max = function (a) {
    var m = a[0];
    for (var i = 1; i < a.length; ++i) {
        if (a[i] > m)
            m = a[i];
    }
    return m;
};
// read d, starting at bit p and mask with m
var bits = function (d, p, m) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8)) >> (p & 7)) & m;
};
// read d, starting at bit p continuing for at least 16 bits
var bits16 = function (d, p) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) >> (p & 7));
};
// get end of byte
var shft = function (p) { return ((p + 7) / 8) | 0; };
// typed array slice - allows garbage collector to free original reference,
// while being more compatible than .slice
var slc = function (v, s, e) {
    if (s == null || s < 0)
        s = 0;
    if (e == null || e > v.length)
        e = v.length;
    // can't use .constructor in case user-supplied
    var n = new (v instanceof u16 ? u16 : v instanceof u32 ? u32 : u8)(e - s);
    n.set(v.subarray(s, e));
    return n;
};
/**
 * Codes for errors generated within this library
 */
exports.FlateErrorCode = {
    UnexpectedEOF: 0,
    InvalidBlockType: 1,
    InvalidLengthLiteral: 2,
    InvalidDistance: 3,
    StreamFinished: 4,
    NoStreamHandler: 5,
    InvalidHeader: 6,
    NoCallback: 7,
    InvalidUTF8: 8,
    ExtraFieldTooLong: 9,
    InvalidDate: 10,
    FilenameTooLong: 11,
    StreamFinishing: 12,
    InvalidZipData: 13,
    UnknownCompressionMethod: 14
};
// error codes
var ec = [
    'unexpected EOF',
    'invalid block type',
    'invalid length/literal',
    'invalid distance',
    'stream finished',
    'no stream handler',
    ,
    'no callback',
    'invalid UTF-8 data',
    'extra field too long',
    'date not in range 1980-2099',
    'filename too long',
    'stream finishing',
    'invalid zip data'
    // determined by unknown compression method
];
;
var err = function (ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
        Error.captureStackTrace(e, err);
    if (!nt)
        throw e;
    return e;
};
// expands raw DEFLATE data
var inflt = function (dat, buf, st) {
    // source length
    var sl = dat.length;
    if (!sl || (st && st.f && !st.l))
        return buf || new u8(0);
    // have to estimate size
    var noBuf = !buf || st;
    // no state
    var noSt = !st || st.i;
    if (!st)
        st = {};
    // Assumes roughly 33% compression ratio average
    if (!buf)
        buf = new u8(sl * 3);
    // ensure buffer can fit at least l elements
    var cbuf = function (l) {
        var bl = buf.length;
        // need to increase size to fit
        if (l > bl) {
            // Double or set to necessary, whichever is greater
            var nbuf = new u8(Math.max(bl * 2, l));
            nbuf.set(buf);
            buf = nbuf;
        }
    };
    //  last chunk         bitpos           bytes
    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
    // total bits
    var tbts = sl * 8;
    do {
        if (!lm) {
            // BFINAL - this is only 1 when last chunk is next
            final = bits(dat, pos, 1);
            // type: 0 = no compression, 1 = fixed huffman, 2 = dynamic huffman
            var type = bits(dat, pos + 1, 3);
            pos += 3;
            if (!type) {
                // go to end of byte boundary
                var s = shft(pos) + 4, l = dat[s - 4] | (dat[s - 3] << 8), t = s + l;
                if (t > sl) {
                    if (noSt)
                        err(0);
                    break;
                }
                // ensure size
                if (noBuf)
                    cbuf(bt + l);
                // Copy over uncompressed data
                buf.set(dat.subarray(s, t), bt);
                // Get new bitpos, update byte count
                st.b = bt += l, st.p = pos = t * 8, st.f = final;
                continue;
            }
            else if (type == 1)
                lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
            else if (type == 2) {
                //  literal                            lengths
                var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
                var tl = hLit + bits(dat, pos + 5, 31) + 1;
                pos += 14;
                // length+distance tree
                var ldt = new u8(tl);
                // code length tree
                var clt = new u8(19);
                for (var i = 0; i < hcLen; ++i) {
                    // use index map to get real code
                    clt[clim[i]] = bits(dat, pos + i * 3, 7);
                }
                pos += hcLen * 3;
                // code lengths bits
                var clb = max(clt), clbmsk = (1 << clb) - 1;
                // code lengths map
                var clm = hMap(clt, clb, 1);
                for (var i = 0; i < tl;) {
                    var r = clm[bits(dat, pos, clbmsk)];
                    // bits read
                    pos += r & 15;
                    // symbol
                    var s = r >>> 4;
                    // code length to copy
                    if (s < 16) {
                        ldt[i++] = s;
                    }
                    else {
                        //  copy   count
                        var c = 0, n = 0;
                        if (s == 16)
                            n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
                        else if (s == 17)
                            n = 3 + bits(dat, pos, 7), pos += 3;
                        else if (s == 18)
                            n = 11 + bits(dat, pos, 127), pos += 7;
                        while (n--)
                            ldt[i++] = c;
                    }
                }
                //    length tree                 distance tree
                var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
                // max length bits
                lbt = max(lt);
                // max dist bits
                dbt = max(dt);
                lm = hMap(lt, lbt, 1);
                dm = hMap(dt, dbt, 1);
            }
            else
                err(1);
            if (pos > tbts) {
                if (noSt)
                    err(0);
                break;
            }
        }
        // Make sure the buffer can hold this + the largest possible addition
        // Maximum chunk size (practically, theoretically infinite) is 2^17;
        if (noBuf)
            cbuf(bt + 131072);
        var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
        var lpos = pos;
        for (;; lpos = pos) {
            // bits read, code
            var c = lm[bits16(dat, pos) & lms], sym = c >>> 4;
            pos += c & 15;
            if (pos > tbts) {
                if (noSt)
                    err(0);
                break;
            }
            if (!c)
                err(2);
            if (sym < 256)
                buf[bt++] = sym;
            else if (sym == 256) {
                lpos = pos, lm = null;
                break;
            }
            else {
                var add = sym - 254;
                // no extra bits needed if less
                if (sym > 264) {
                    // index
                    var i = sym - 257, b = fleb[i];
                    add = bits(dat, pos, (1 << b) - 1) + fl[i];
                    pos += b;
                }
                // dist
                var d = dm[bits16(dat, pos) & dms], dsym = d >>> 4;
                if (!d)
                    err(3);
                pos += d & 15;
                var dt = fd[dsym];
                if (dsym > 3) {
                    var b = fdeb[dsym];
                    dt += bits16(dat, pos) & ((1 << b) - 1), pos += b;
                }
                if (pos > tbts) {
                    if (noSt)
                        err(0);
                    break;
                }
                if (noBuf)
                    cbuf(bt + 131072);
                var end = bt + add;
                for (; bt < end; bt += 4) {
                    buf[bt] = buf[bt - dt];
                    buf[bt + 1] = buf[bt + 1 - dt];
                    buf[bt + 2] = buf[bt + 2 - dt];
                    buf[bt + 3] = buf[bt + 3 - dt];
                }
                bt = end;
            }
        }
        st.l = lm, st.p = lpos, st.b = bt, st.f = final;
        if (lm)
            final = 1, st.m = lbt, st.d = dm, st.n = dbt;
    } while (!final);
    return bt == buf.length ? buf : slc(buf, 0, bt);
};
// starting at p, write the minimum number of bits that can hold v to d
var wbits = function (d, p, v) {
    v <<= p & 7;
    var o = (p / 8) | 0;
    d[o] |= v;
    d[o + 1] |= v >>> 8;
};
// starting at p, write the minimum number of bits (>8) that can hold v to d
var wbits16 = function (d, p, v) {
    v <<= p & 7;
    var o = (p / 8) | 0;
    d[o] |= v;
    d[o + 1] |= v >>> 8;
    d[o + 2] |= v >>> 16;
};
// creates code lengths from a frequency table
var hTree = function (d, mb) {
    // Need extra info to make a tree
    var t = [];
    for (var i = 0; i < d.length; ++i) {
        if (d[i])
            t.push({ s: i, f: d[i] });
    }
    var s = t.length;
    var t2 = t.slice();
    if (!s)
        return [et, 0];
    if (s == 1) {
        var v = new u8(t[0].s + 1);
        v[t[0].s] = 1;
        return [v, 1];
    }
    t.sort(function (a, b) { return a.f - b.f; });
    // after i2 reaches last ind, will be stopped
    // freq must be greater than largest possible number of symbols
    t.push({ s: -1, f: 25001 });
    var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
    t[0] = { s: -1, f: l.f + r.f, l: l, r: r };
    // efficient algorithm from UZIP.js
    // i0 is lookbehind, i2 is lookahead - after processing two low-freq
    // symbols that combined have high freq, will start processing i2 (high-freq,
    // non-composite) symbols instead
    // see https://reddit.com/r/photopea/comments/ikekht/uzipjs_questions/
    while (i1 != s - 1) {
        l = t[t[i0].f < t[i2].f ? i0++ : i2++];
        r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
        t[i1++] = { s: -1, f: l.f + r.f, l: l, r: r };
    }
    var maxSym = t2[0].s;
    for (var i = 1; i < s; ++i) {
        if (t2[i].s > maxSym)
            maxSym = t2[i].s;
    }
    // code lengths
    var tr = new u16(maxSym + 1);
    // max bits in tree
    var mbt = ln(t[i1 - 1], tr, 0);
    if (mbt > mb) {
        // more algorithms from UZIP.js
        // TODO: find out how this code works (debt)
        //  ind    debt
        var i = 0, dt = 0;
        //    left            cost
        var lft = mbt - mb, cst = 1 << lft;
        t2.sort(function (a, b) { return tr[b.s] - tr[a.s] || a.f - b.f; });
        for (; i < s; ++i) {
            var i2_1 = t2[i].s;
            if (tr[i2_1] > mb) {
                dt += cst - (1 << (mbt - tr[i2_1]));
                tr[i2_1] = mb;
            }
            else
                break;
        }
        dt >>>= lft;
        while (dt > 0) {
            var i2_2 = t2[i].s;
            if (tr[i2_2] < mb)
                dt -= 1 << (mb - tr[i2_2]++ - 1);
            else
                ++i;
        }
        for (; i >= 0 && dt; --i) {
            var i2_3 = t2[i].s;
            if (tr[i2_3] == mb) {
                --tr[i2_3];
                ++dt;
            }
        }
        mbt = mb;
    }
    return [new u8(tr), mbt];
};
// get the max length and assign length codes
var ln = function (n, l, d) {
    return n.s == -1
        ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1))
        : (l[n.s] = d);
};
// length codes generation
var lc = function (c) {
    var s = c.length;
    // Note that the semicolon was intentional
    while (s && !c[--s])
        ;
    var cl = new u16(++s);
    //  ind      num         streak
    var cli = 0, cln = c[0], cls = 1;
    var w = function (v) { cl[cli++] = v; };
    for (var i = 1; i <= s; ++i) {
        if (c[i] == cln && i != s)
            ++cls;
        else {
            if (!cln && cls > 2) {
                for (; cls > 138; cls -= 138)
                    w(32754);
                if (cls > 2) {
                    w(cls > 10 ? ((cls - 11) << 5) | 28690 : ((cls - 3) << 5) | 12305);
                    cls = 0;
                }
            }
            else if (cls > 3) {
                w(cln), --cls;
                for (; cls > 6; cls -= 6)
                    w(8304);
                if (cls > 2)
                    w(((cls - 3) << 5) | 8208), cls = 0;
            }
            while (cls--)
                w(cln);
            cls = 1;
            cln = c[i];
        }
    }
    return [cl.subarray(0, cli), s];
};
// calculate the length of output from tree, code lengths
var clen = function (cf, cl) {
    var l = 0;
    for (var i = 0; i < cl.length; ++i)
        l += cf[i] * cl[i];
    return l;
};
// writes a fixed block
// returns the new bit pos
var wfblk = function (out, pos, dat) {
    // no need to write 00 as type: TypedArray defaults to 0
    var s = dat.length;
    var o = shft(pos + 2);
    out[o] = s & 255;
    out[o + 1] = s >>> 8;
    out[o + 2] = out[o] ^ 255;
    out[o + 3] = out[o + 1] ^ 255;
    for (var i = 0; i < s; ++i)
        out[o + i + 4] = dat[i];
    return (o + 4 + s) * 8;
};
// writes a block
var wblk = function (dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
    wbits(out, p++, final);
    ++lf[256];
    var _a = hTree(lf, 15), dlt = _a[0], mlb = _a[1];
    var _b = hTree(df, 15), ddt = _b[0], mdb = _b[1];
    var _c = lc(dlt), lclt = _c[0], nlc = _c[1];
    var _d = lc(ddt), lcdt = _d[0], ndc = _d[1];
    var lcfreq = new u16(19);
    for (var i = 0; i < lclt.length; ++i)
        lcfreq[lclt[i] & 31]++;
    for (var i = 0; i < lcdt.length; ++i)
        lcfreq[lcdt[i] & 31]++;
    var _e = hTree(lcfreq, 7), lct = _e[0], mlcb = _e[1];
    var nlcc = 19;
    for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
        ;
    var flen = (bl + 5) << 3;
    var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
    var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + (2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18]);
    if (flen <= ftlen && flen <= dtlen)
        return wfblk(out, p, dat.subarray(bs, bs + bl));
    var lm, ll, dm, dl;
    wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
    if (dtlen < ftlen) {
        lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
        var llm = hMap(lct, mlcb, 0);
        wbits(out, p, nlc - 257);
        wbits(out, p + 5, ndc - 1);
        wbits(out, p + 10, nlcc - 4);
        p += 14;
        for (var i = 0; i < nlcc; ++i)
            wbits(out, p + 3 * i, lct[clim[i]]);
        p += 3 * nlcc;
        var lcts = [lclt, lcdt];
        for (var it = 0; it < 2; ++it) {
            var clct = lcts[it];
            for (var i = 0; i < clct.length; ++i) {
                var len = clct[i] & 31;
                wbits(out, p, llm[len]), p += lct[len];
                if (len > 15)
                    wbits(out, p, (clct[i] >>> 5) & 127), p += clct[i] >>> 12;
            }
        }
    }
    else {
        lm = flm, ll = flt, dm = fdm, dl = fdt;
    }
    for (var i = 0; i < li; ++i) {
        if (syms[i] > 255) {
            var len = (syms[i] >>> 18) & 31;
            wbits16(out, p, lm[len + 257]), p += ll[len + 257];
            if (len > 7)
                wbits(out, p, (syms[i] >>> 23) & 31), p += fleb[len];
            var dst = syms[i] & 31;
            wbits16(out, p, dm[dst]), p += dl[dst];
            if (dst > 3)
                wbits16(out, p, (syms[i] >>> 5) & 8191), p += fdeb[dst];
        }
        else {
            wbits16(out, p, lm[syms[i]]), p += ll[syms[i]];
        }
    }
    wbits16(out, p, lm[256]);
    return p + ll[256];
};
// deflate options (nice << 13) | chain
var deo = /*#__PURE__*/ new u32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
// empty
var et = /*#__PURE__*/ new u8(0);
// compresses data into a raw DEFLATE buffer
var dflt = function (dat, lvl, plvl, pre, post, lst) {
    var s = dat.length;
    var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7000)) + post);
    // writing to this writes to the output buffer
    var w = o.subarray(pre, o.length - post);
    var pos = 0;
    if (!lvl || s < 8) {
        for (var i = 0; i <= s; i += 65535) {
            // end
            var e = i + 65535;
            if (e < s) {
                // write full block
                pos = wfblk(w, pos, dat.subarray(i, e));
            }
            else {
                // write final block
                w[i] = lst;
                pos = wfblk(w, pos, dat.subarray(i, s));
            }
        }
    }
    else {
        var opt = deo[lvl - 1];
        var n = opt >>> 13, c = opt & 8191;
        var msk_1 = (1 << plvl) - 1;
        //    prev 2-byte val map    curr 2-byte val map
        var prev = new u16(32768), head = new u16(msk_1 + 1);
        var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
        var hsh = function (i) { return (dat[i] ^ (dat[i + 1] << bs1_1) ^ (dat[i + 2] << bs2_1)) & msk_1; };
        // 24576 is an arbitrary number of maximum symbols per block
        // 424 buffer for last block
        var syms = new u32(25000);
        // length/literal freq   distance freq
        var lf = new u16(288), df = new u16(32);
        //  l/lcnt  exbits  index  l/lind  waitdx  bitpos
        var lc_1 = 0, eb = 0, i = 0, li = 0, wi = 0, bs = 0;
        for (; i < s; ++i) {
            // hash value
            // deopt when i > s - 3 - at end, deopt acceptable
            var hv = hsh(i);
            // index mod 32768    previous index mod
            var imod = i & 32767, pimod = head[hv];
            prev[imod] = pimod;
            head[hv] = imod;
            // We always should modify head and prev, but only add symbols if
            // this data is not yet processed ("wait" for wait index)
            if (wi <= i) {
                // bytes remaining
                var rem = s - i;
                if ((lc_1 > 7000 || li > 24576) && rem > 423) {
                    pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
                    li = lc_1 = eb = 0, bs = i;
                    for (var j = 0; j < 286; ++j)
                        lf[j] = 0;
                    for (var j = 0; j < 30; ++j)
                        df[j] = 0;
                }
                //  len    dist   chain
                var l = 2, d = 0, ch_1 = c, dif = (imod - pimod) & 32767;
                if (rem > 2 && hv == hsh(i - dif)) {
                    var maxn = Math.min(n, rem) - 1;
                    var maxd = Math.min(32767, i);
                    // max possible length
                    // not capped at dif because decompressors implement "rolling" index population
                    var ml = Math.min(258, rem);
                    while (dif <= maxd && --ch_1 && imod != pimod) {
                        if (dat[i + l] == dat[i + l - dif]) {
                            var nl = 0;
                            for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                                ;
                            if (nl > l) {
                                l = nl, d = dif;
                                // break out early when we reach "nice" (we are satisfied enough)
                                if (nl > maxn)
                                    break;
                                // now, find the rarest 2-byte sequence within this
                                // length of literals and search for that instead.
                                // Much faster than just using the start
                                var mmd = Math.min(dif, nl - 2);
                                var md = 0;
                                for (var j = 0; j < mmd; ++j) {
                                    var ti = (i - dif + j + 32768) & 32767;
                                    var pti = prev[ti];
                                    var cd = (ti - pti + 32768) & 32767;
                                    if (cd > md)
                                        md = cd, pimod = ti;
                                }
                            }
                        }
                        // check the previous match
                        imod = pimod, pimod = prev[imod];
                        dif += (imod - pimod + 32768) & 32767;
                    }
                }
                // d will be nonzero only when a match was found
                if (d) {
                    // store both dist and len data in one Uint32
                    // Make sure this is recognized as a len/dist with 28th bit (2^28)
                    syms[li++] = 268435456 | (revfl[l] << 18) | revfd[d];
                    var lin = revfl[l] & 31, din = revfd[d] & 31;
                    eb += fleb[lin] + fdeb[din];
                    ++lf[257 + lin];
                    ++df[din];
                    wi = i + l;
                    ++lc_1;
                }
                else {
                    syms[li++] = dat[i];
                    ++lf[dat[i]];
                }
            }
        }
        pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
        // this is the easiest way to avoid needing to maintain state
        if (!lst && pos & 7)
            pos = wfblk(w, pos + 1, et);
    }
    return slc(o, 0, pre + shft(pos) + post);
};
// CRC32 table
var crct = /*#__PURE__*/ (function () {
    var t = new Int32Array(256);
    for (var i = 0; i < 256; ++i) {
        var c = i, k = 9;
        while (--k)
            c = ((c & 1) && -306674912) ^ (c >>> 1);
        t[i] = c;
    }
    return t;
})();
// CRC32
var crc = function () {
    var c = -1;
    return {
        p: function (d) {
            // closures have awful performance
            var cr = c;
            for (var i = 0; i < d.length; ++i)
                cr = crct[(cr & 255) ^ d[i]] ^ (cr >>> 8);
            c = cr;
        },
        d: function () { return ~c; }
    };
};
// Alder32
var adler = function () {
    var a = 1, b = 0;
    return {
        p: function (d) {
            // closures have awful performance
            var n = a, m = b;
            var l = d.length | 0;
            for (var i = 0; i != l;) {
                var e = Math.min(i + 2655, l);
                for (; i < e; ++i)
                    m += n += d[i];
                n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
            }
            a = n, b = m;
        },
        d: function () {
            a %= 65521, b %= 65521;
            return (a & 255) << 24 | (a >>> 8) << 16 | (b & 255) << 8 | (b >>> 8);
        }
    };
};
;
// deflate with opts
var dopt = function (dat, opt, pre, post, st) {
    return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : (12 + opt.mem), pre, post, !st);
};
// Walmart object spread
var mrg = function (a, b) {
    var o = {};
    for (var k in a)
        o[k] = a[k];
    for (var k in b)
        o[k] = b[k];
    return o;
};
// worker clone
// This is possibly the craziest part of the entire codebase, despite how simple it may seem.
// The only parameter to this function is a closure that returns an array of variables outside of the function scope.
// We're going to try to figure out the variable names used in the closure as strings because that is crucial for workerization.
// We will return an object mapping of true variable name to value (basically, the current scope as a JS object).
// The reason we can't just use the original variable names is minifiers mangling the toplevel scope.
// This took me three weeks to figure out how to do.
var wcln = function (fn, fnStr, td) {
    var dt = fn();
    var st = fn.toString();
    var ks = st.slice(st.indexOf('[') + 1, st.lastIndexOf(']')).replace(/ /g, '').split(',');
    for (var i = 0; i < dt.length; ++i) {
        var v = dt[i], k = ks[i];
        if (typeof v == 'function') {
            fnStr += ';' + k + '=';
            var st_1 = v.toString();
            if (v.prototype) {
                // for global objects
                if (st_1.indexOf('[native code]') != -1) {
                    var spInd = st_1.indexOf(' ', 8) + 1;
                    fnStr += st_1.slice(spInd, st_1.indexOf('(', spInd));
                }
                else {
                    fnStr += st_1;
                    for (var t in v.prototype)
                        fnStr += ';' + k + '.prototype.' + t + '=' + v.prototype[t].toString();
                }
            }
            else
                fnStr += st_1;
        }
        else
            td[k] = v;
    }
    return [fnStr, td];
};
var ch = [];
// clone bufs
var cbfs = function (v) {
    var tl = [];
    for (var k in v) {
        if (v[k] instanceof u8 || v[k] instanceof u16 || v[k] instanceof u32)
            tl.push((v[k] = new v[k].constructor(v[k])).buffer);
    }
    return tl;
};
// use a worker to execute code
var wrkr = function (fns, init, id, cb) {
    var _a;
    if (!ch[id]) {
        var fnStr = '', td_1 = {}, m = fns.length - 1;
        for (var i = 0; i < m; ++i)
            _a = wcln(fns[i], fnStr, td_1), fnStr = _a[0], td_1 = _a[1];
        ch[id] = wcln(fns[m], fnStr, td_1);
    }
    var td = mrg({}, ch[id][1]);
    return node_worker_1["default"](ch[id][0] + ';onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=' + init.toString() + '}', id, td, cbfs(td), cb);
};
// base async inflate fn
var bInflt = function () { return [u8, u16, u32, fleb, fdeb, clim, fl, fd, flrm, fdrm, rev, ec, hMap, max, bits, bits16, shft, slc, err, inflt, inflateSync, pbf, gu8]; };
var bDflt = function () { return [u8, u16, u32, fleb, fdeb, clim, revfl, revfd, flm, flt, fdm, fdt, rev, deo, et, hMap, wbits, wbits16, hTree, ln, lc, clen, wfblk, wblk, shft, slc, dflt, dopt, deflateSync, pbf]; };
// gzip extra
var gze = function () { return [gzh, gzhl, wbytes, crc, crct]; };
// gunzip extra
var guze = function () { return [gzs, gzl]; };
// zlib extra
var zle = function () { return [zlh, wbytes, adler]; };
// unzlib extra
var zule = function () { return [zlv]; };
// post buf
var pbf = function (msg) { return postMessage(msg, [msg.buffer]); };
// get u8
var gu8 = function (o) { return o && o.size && new u8(o.size); };
// async helper
var cbify = function (dat, opts, fns, init, id, cb) {
    var w = wrkr(fns, init, id, function (err, dat) {
        w.terminate();
        cb(err, dat);
    });
    w.postMessage([dat, opts], opts.consume ? [dat.buffer] : []);
    return function () { w.terminate(); };
};
// auto stream
var astrm = function (strm) {
    strm.ondata = function (dat, final) { return postMessage([dat, final], [dat.buffer]); };
    return function (ev) { return strm.push(ev.data[0], ev.data[1]); };
};
// async stream attach
var astrmify = function (fns, strm, opts, init, id) {
    var t;
    var w = wrkr(fns, init, id, function (err, dat) {
        if (err)
            w.terminate(), strm.ondata.call(strm, err);
        else {
            if (dat[1])
                w.terminate();
            strm.ondata.call(strm, err, dat[0], dat[1]);
        }
    });
    w.postMessage(opts);
    strm.push = function (d, f) {
        if (!strm.ondata)
            err(5);
        if (t)
            strm.ondata(err(4, 0, 1), null, !!f);
        w.postMessage([d, t = f], [d.buffer]);
    };
    strm.terminate = function () { w.terminate(); };
};
// read 2 bytes
var b2 = function (d, b) { return d[b] | (d[b + 1] << 8); };
// read 4 bytes
var b4 = function (d, b) { return (d[b] | (d[b + 1] << 8) | (d[b + 2] << 16) | (d[b + 3] << 24)) >>> 0; };
var b8 = function (d, b) { return b4(d, b) + (b4(d, b + 4) * 4294967296); };
// write bytes
var wbytes = function (d, b, v) {
    for (; v; ++b)
        d[b] = v, v >>>= 8;
};
// gzip header
var gzh = function (c, o) {
    var fn = o.filename;
    c[0] = 31, c[1] = 139, c[2] = 8, c[8] = o.level < 2 ? 4 : o.level == 9 ? 2 : 0, c[9] = 3; // assume Unix
    if (o.mtime != 0)
        wbytes(c, 4, Math.floor(new Date(o.mtime || Date.now()) / 1000));
    if (fn) {
        c[3] = 8;
        for (var i = 0; i <= fn.length; ++i)
            c[i + 10] = fn.charCodeAt(i);
    }
};
// gzip footer: -8 to -4 = CRC, -4 to -0 is length
// gzip start
var gzs = function (d) {
    if (d[0] != 31 || d[1] != 139 || d[2] != 8)
        err(6, 'invalid gzip data');
    var flg = d[3];
    var st = 10;
    if (flg & 4)
        st += d[10] | (d[11] << 8) + 2;
    for (var zs = (flg >> 3 & 1) + (flg >> 4 & 1); zs > 0; zs -= !d[st++])
        ;
    return st + (flg & 2);
};
// gzip length
var gzl = function (d) {
    var l = d.length;
    return ((d[l - 4] | d[l - 3] << 8 | d[l - 2] << 16) | (d[l - 1] << 24)) >>> 0;
};
// gzip header length
var gzhl = function (o) { return 10 + ((o.filename && (o.filename.length + 1)) || 0); };
// zlib header
var zlh = function (c, o) {
    var lv = o.level, fl = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
    c[0] = 120, c[1] = (fl << 6) | (fl ? (32 - 2 * fl) : 1);
};
// zlib valid
var zlv = function (d) {
    if ((d[0] & 15) != 8 || (d[0] >>> 4) > 7 || ((d[0] << 8 | d[1]) % 31))
        err(6, 'invalid zlib data');
    if (d[1] & 32)
        err(6, 'invalid zlib data: preset dictionaries not supported');
};
function AsyncCmpStrm(opts, cb) {
    if (!cb && typeof opts == 'function')
        cb = opts, opts = {};
    this.ondata = cb;
    return opts;
}
// zlib footer: -4 to -0 is Adler32
/**
 * Streaming DEFLATE compression
 */
var Deflate = /*#__PURE__*/ (function () {
    function Deflate(opts, cb) {
        if (!cb && typeof opts == 'function')
            cb = opts, opts = {};
        this.ondata = cb;
        this.o = opts || {};
    }
    Deflate.prototype.p = function (c, f) {
        this.ondata(dopt(c, this.o, 0, 0, !f), f);
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Deflate.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (this.d)
            err(4);
        this.d = final;
        this.p(chunk, final || false);
    };
    return Deflate;
}());
exports.Deflate = Deflate;
/**
 * Asynchronous streaming DEFLATE compression
 */
var AsyncDeflate = /*#__PURE__*/ (function () {
    function AsyncDeflate(opts, cb) {
        astrmify([
            bDflt,
            function () { return [astrm, Deflate]; }
        ], this, AsyncCmpStrm.call(this, opts, cb), function (ev) {
            var strm = new Deflate(ev.data);
            onmessage = astrm(strm);
        }, 6);
    }
    return AsyncDeflate;
}());
exports.AsyncDeflate = AsyncDeflate;
function deflate(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
    ], function (ev) { return pbf(deflateSync(ev.data[0], ev.data[1])); }, 0, cb);
}
exports.deflate = deflate;
/**
 * Compresses data with DEFLATE without any wrapper
 * @param data The data to compress
 * @param opts The compression options
 * @returns The deflated version of the data
 */
function deflateSync(data, opts) {
    return dopt(data, opts || {}, 0, 0);
}
exports.deflateSync = deflateSync;
/**
 * Streaming DEFLATE decompression
 */
var Inflate = /*#__PURE__*/ (function () {
    /**
     * Creates an inflation stream
     * @param cb The callback to call whenever data is inflated
     */
    function Inflate(cb) {
        this.s = {};
        this.p = new u8(0);
        this.ondata = cb;
    }
    Inflate.prototype.e = function (c) {
        if (!this.ondata)
            err(5);
        if (this.d)
            err(4);
        var l = this.p.length;
        var n = new u8(l + c.length);
        n.set(this.p), n.set(c, l), this.p = n;
    };
    Inflate.prototype.c = function (final) {
        this.d = this.s.i = final || false;
        var bts = this.s.b;
        var dt = inflt(this.p, this.o, this.s);
        this.ondata(slc(dt, bts, this.s.b), this.d);
        this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
        this.p = slc(this.p, (this.s.p / 8) | 0), this.s.p &= 7;
    };
    /**
     * Pushes a chunk to be inflated
     * @param chunk The chunk to push
     * @param final Whether this is the final chunk
     */
    Inflate.prototype.push = function (chunk, final) {
        this.e(chunk), this.c(final);
    };
    return Inflate;
}());
exports.Inflate = Inflate;
/**
 * Asynchronous streaming DEFLATE decompression
 */
var AsyncInflate = /*#__PURE__*/ (function () {
    /**
     * Creates an asynchronous inflation stream
     * @param cb The callback to call whenever data is deflated
     */
    function AsyncInflate(cb) {
        this.ondata = cb;
        astrmify([
            bInflt,
            function () { return [astrm, Inflate]; }
        ], this, 0, function () {
            var strm = new Inflate();
            onmessage = astrm(strm);
        }, 7);
    }
    return AsyncInflate;
}());
exports.AsyncInflate = AsyncInflate;
function inflate(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt
    ], function (ev) { return pbf(inflateSync(ev.data[0], gu8(ev.data[1]))); }, 1, cb);
}
exports.inflate = inflate;
/**
 * Expands DEFLATE data with no wrapper
 * @param data The data to decompress
 * @param out Where to write the data. Saves memory if you know the decompressed size and provide an output buffer of that length.
 * @returns The decompressed version of the data
 */
function inflateSync(data, out) {
    return inflt(data, out);
}
exports.inflateSync = inflateSync;
// before you yell at me for not just using extends, my reason is that TS inheritance is hard to workerize.
/**
 * Streaming GZIP compression
 */
var Gzip = /*#__PURE__*/ (function () {
    function Gzip(opts, cb) {
        this.c = crc();
        this.l = 0;
        this.v = 1;
        Deflate.call(this, opts, cb);
    }
    /**
     * Pushes a chunk to be GZIPped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Gzip.prototype.push = function (chunk, final) {
        Deflate.prototype.push.call(this, chunk, final);
    };
    Gzip.prototype.p = function (c, f) {
        this.c.p(c);
        this.l += c.length;
        var raw = dopt(c, this.o, this.v && gzhl(this.o), f && 8, !f);
        if (this.v)
            gzh(raw, this.o), this.v = 0;
        if (f)
            wbytes(raw, raw.length - 8, this.c.d()), wbytes(raw, raw.length - 4, this.l);
        this.ondata(raw, f);
    };
    return Gzip;
}());
exports.Gzip = Gzip;
exports.Compress = Gzip;
/**
 * Asynchronous streaming GZIP compression
 */
var AsyncGzip = /*#__PURE__*/ (function () {
    function AsyncGzip(opts, cb) {
        astrmify([
            bDflt,
            gze,
            function () { return [astrm, Deflate, Gzip]; }
        ], this, AsyncCmpStrm.call(this, opts, cb), function (ev) {
            var strm = new Gzip(ev.data);
            onmessage = astrm(strm);
        }, 8);
    }
    return AsyncGzip;
}());
exports.AsyncGzip = AsyncGzip;
exports.AsyncCompress = AsyncGzip;
function gzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
        gze,
        function () { return [gzipSync]; }
    ], function (ev) { return pbf(gzipSync(ev.data[0], ev.data[1])); }, 2, cb);
}
exports.gzip = gzip;
exports.compress = gzip;
/**
 * Compresses data with GZIP
 * @param data The data to compress
 * @param opts The compression options
 * @returns The gzipped version of the data
 */
function gzipSync(data, opts) {
    if (!opts)
        opts = {};
    var c = crc(), l = data.length;
    c.p(data);
    var d = dopt(data, opts, gzhl(opts), 8), s = d.length;
    return gzh(d, opts), wbytes(d, s - 8, c.d()), wbytes(d, s - 4, l), d;
}
exports.gzipSync = gzipSync;
exports.compressSync = gzipSync;
/**
 * Streaming GZIP decompression
 */
var Gunzip = /*#__PURE__*/ (function () {
    /**
     * Creates a GUNZIP stream
     * @param cb The callback to call whenever data is inflated
     */
    function Gunzip(cb) {
        this.v = 1;
        Inflate.call(this, cb);
    }
    /**
     * Pushes a chunk to be GUNZIPped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Gunzip.prototype.push = function (chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        if (this.v) {
            var s = this.p.length > 3 ? gzs(this.p) : 4;
            if (s >= this.p.length && !final)
                return;
            this.p = this.p.subarray(s), this.v = 0;
        }
        if (final) {
            if (this.p.length < 8)
                err(6, 'invalid gzip data');
            this.p = this.p.subarray(0, -8);
        }
        // necessary to prevent TS from using the closure value
        // This allows for workerization to function correctly
        Inflate.prototype.c.call(this, final);
    };
    return Gunzip;
}());
exports.Gunzip = Gunzip;
/**
 * Asynchronous streaming GZIP decompression
 */
var AsyncGunzip = /*#__PURE__*/ (function () {
    /**
     * Creates an asynchronous GUNZIP stream
     * @param cb The callback to call whenever data is deflated
     */
    function AsyncGunzip(cb) {
        this.ondata = cb;
        astrmify([
            bInflt,
            guze,
            function () { return [astrm, Inflate, Gunzip]; }
        ], this, 0, function () {
            var strm = new Gunzip();
            onmessage = astrm(strm);
        }, 9);
    }
    return AsyncGunzip;
}());
exports.AsyncGunzip = AsyncGunzip;
function gunzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt,
        guze,
        function () { return [gunzipSync]; }
    ], function (ev) { return pbf(gunzipSync(ev.data[0])); }, 3, cb);
}
exports.gunzip = gunzip;
/**
 * Expands GZIP data
 * @param data The data to decompress
 * @param out Where to write the data. GZIP already encodes the output size, so providing this doesn't save memory.
 * @returns The decompressed version of the data
 */
function gunzipSync(data, out) {
    return inflt(data.subarray(gzs(data), -8), out || new u8(gzl(data)));
}
exports.gunzipSync = gunzipSync;
/**
 * Streaming Zlib compression
 */
var Zlib = /*#__PURE__*/ (function () {
    function Zlib(opts, cb) {
        this.c = adler();
        this.v = 1;
        Deflate.call(this, opts, cb);
    }
    /**
     * Pushes a chunk to be zlibbed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Zlib.prototype.push = function (chunk, final) {
        Deflate.prototype.push.call(this, chunk, final);
    };
    Zlib.prototype.p = function (c, f) {
        this.c.p(c);
        var raw = dopt(c, this.o, this.v && 2, f && 4, !f);
        if (this.v)
            zlh(raw, this.o), this.v = 0;
        if (f)
            wbytes(raw, raw.length - 4, this.c.d());
        this.ondata(raw, f);
    };
    return Zlib;
}());
exports.Zlib = Zlib;
/**
 * Asynchronous streaming Zlib compression
 */
var AsyncZlib = /*#__PURE__*/ (function () {
    function AsyncZlib(opts, cb) {
        astrmify([
            bDflt,
            zle,
            function () { return [astrm, Deflate, Zlib]; }
        ], this, AsyncCmpStrm.call(this, opts, cb), function (ev) {
            var strm = new Zlib(ev.data);
            onmessage = astrm(strm);
        }, 10);
    }
    return AsyncZlib;
}());
exports.AsyncZlib = AsyncZlib;
function zlib(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bDflt,
        zle,
        function () { return [zlibSync]; }
    ], function (ev) { return pbf(zlibSync(ev.data[0], ev.data[1])); }, 4, cb);
}
exports.zlib = zlib;
/**
 * Compress data with Zlib
 * @param data The data to compress
 * @param opts The compression options
 * @returns The zlib-compressed version of the data
 */
function zlibSync(data, opts) {
    if (!opts)
        opts = {};
    var a = adler();
    a.p(data);
    var d = dopt(data, opts, 2, 4);
    return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
exports.zlibSync = zlibSync;
/**
 * Streaming Zlib decompression
 */
var Unzlib = /*#__PURE__*/ (function () {
    /**
     * Creates a Zlib decompression stream
     * @param cb The callback to call whenever data is inflated
     */
    function Unzlib(cb) {
        this.v = 1;
        Inflate.call(this, cb);
    }
    /**
     * Pushes a chunk to be unzlibbed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Unzlib.prototype.push = function (chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        if (this.v) {
            if (this.p.length < 2 && !final)
                return;
            this.p = this.p.subarray(2), this.v = 0;
        }
        if (final) {
            if (this.p.length < 4)
                err(6, 'invalid zlib data');
            this.p = this.p.subarray(0, -4);
        }
        // necessary to prevent TS from using the closure value
        // This allows for workerization to function correctly
        Inflate.prototype.c.call(this, final);
    };
    return Unzlib;
}());
exports.Unzlib = Unzlib;
/**
 * Asynchronous streaming Zlib decompression
 */
var AsyncUnzlib = /*#__PURE__*/ (function () {
    /**
     * Creates an asynchronous Zlib decompression stream
     * @param cb The callback to call whenever data is deflated
     */
    function AsyncUnzlib(cb) {
        this.ondata = cb;
        astrmify([
            bInflt,
            zule,
            function () { return [astrm, Inflate, Unzlib]; }
        ], this, 0, function () {
            var strm = new Unzlib();
            onmessage = astrm(strm);
        }, 11);
    }
    return AsyncUnzlib;
}());
exports.AsyncUnzlib = AsyncUnzlib;
function unzlib(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return cbify(data, opts, [
        bInflt,
        zule,
        function () { return [unzlibSync]; }
    ], function (ev) { return pbf(unzlibSync(ev.data[0], gu8(ev.data[1]))); }, 5, cb);
}
exports.unzlib = unzlib;
/**
 * Expands Zlib data
 * @param data The data to decompress
 * @param out Where to write the data. Saves memory if you know the decompressed size and provide an output buffer of that length.
 * @returns The decompressed version of the data
 */
function unzlibSync(data, out) {
    return inflt((zlv(data), data.subarray(2, -4)), out);
}
exports.unzlibSync = unzlibSync;
/**
 * Streaming GZIP, Zlib, or raw DEFLATE decompression
 */
var Decompress = /*#__PURE__*/ (function () {
    /**
     * Creates a decompression stream
     * @param cb The callback to call whenever data is decompressed
     */
    function Decompress(cb) {
        this.G = Gunzip;
        this.I = Inflate;
        this.Z = Unzlib;
        this.ondata = cb;
    }
    /**
     * Pushes a chunk to be decompressed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Decompress.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (!this.s) {
            if (this.p && this.p.length) {
                var n = new u8(this.p.length + chunk.length);
                n.set(this.p), n.set(chunk, this.p.length);
            }
            else
                this.p = chunk;
            if (this.p.length > 2) {
                var _this_1 = this;
                var cb = function () { _this_1.ondata.apply(_this_1, arguments); };
                this.s = (this.p[0] == 31 && this.p[1] == 139 && this.p[2] == 8)
                    ? new this.G(cb)
                    : ((this.p[0] & 15) != 8 || (this.p[0] >> 4) > 7 || ((this.p[0] << 8 | this.p[1]) % 31))
                        ? new this.I(cb)
                        : new this.Z(cb);
                this.s.push(this.p, final);
                this.p = null;
            }
        }
        else
            this.s.push(chunk, final);
    };
    return Decompress;
}());
exports.Decompress = Decompress;
/**
 * Asynchronous streaming GZIP, Zlib, or raw DEFLATE decompression
 */
var AsyncDecompress = /*#__PURE__*/ (function () {
    /**
   * Creates an asynchronous decompression stream
   * @param cb The callback to call whenever data is decompressed
   */
    function AsyncDecompress(cb) {
        this.G = AsyncGunzip;
        this.I = AsyncInflate;
        this.Z = AsyncUnzlib;
        this.ondata = cb;
    }
    /**
     * Pushes a chunk to be decompressed
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    AsyncDecompress.prototype.push = function (chunk, final) {
        Decompress.prototype.push.call(this, chunk, final);
    };
    return AsyncDecompress;
}());
exports.AsyncDecompress = AsyncDecompress;
function decompress(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    return (data[0] == 31 && data[1] == 139 && data[2] == 8)
        ? gunzip(data, opts, cb)
        : ((data[0] & 15) != 8 || (data[0] >> 4) > 7 || ((data[0] << 8 | data[1]) % 31))
            ? inflate(data, opts, cb)
            : unzlib(data, opts, cb);
}
exports.decompress = decompress;
/**
 * Expands compressed GZIP, Zlib, or raw DEFLATE data, automatically detecting the format
 * @param data The data to decompress
 * @param out Where to write the data. Saves memory if you know the decompressed size and provide an output buffer of that length.
 * @returns The decompressed version of the data
 */
function decompressSync(data, out) {
    return (data[0] == 31 && data[1] == 139 && data[2] == 8)
        ? gunzipSync(data, out)
        : ((data[0] & 15) != 8 || (data[0] >> 4) > 7 || ((data[0] << 8 | data[1]) % 31))
            ? inflateSync(data, out)
            : unzlibSync(data, out);
}
exports.decompressSync = decompressSync;
// flatten a directory structure
var fltn = function (d, p, t, o) {
    for (var k in d) {
        var val = d[k], n = p + k;
        if (val instanceof u8)
            t[n] = [val, o];
        else if (Array.isArray(val))
            t[n] = [val[0], mrg(o, val[1])];
        else
            fltn(val, n + '/', t, o);
    }
};
// text encoder
var te = typeof TextEncoder != 'undefined' && /*#__PURE__*/ new TextEncoder();
// text decoder
var td = typeof TextDecoder != 'undefined' && /*#__PURE__*/ new TextDecoder();
// text decoder stream
var tds = 0;
try {
    td.decode(et, { stream: true });
    tds = 1;
}
catch (e) { }
// decode UTF8
var dutf8 = function (d) {
    for (var r = '', i = 0;;) {
        var c = d[i++];
        var eb = (c > 127) + (c > 223) + (c > 239);
        if (i + eb > d.length)
            return [r, slc(d, i - 1)];
        if (!eb)
            r += String.fromCharCode(c);
        else if (eb == 3) {
            c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | (d[i++] & 63)) - 65536,
                r += String.fromCharCode(55296 | (c >> 10), 56320 | (c & 1023));
        }
        else if (eb & 1)
            r += String.fromCharCode((c & 31) << 6 | (d[i++] & 63));
        else
            r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | (d[i++] & 63));
    }
};
/**
 * Streaming UTF-8 decoding
 */
var DecodeUTF8 = /*#__PURE__*/ (function () {
    /**
     * Creates a UTF-8 decoding stream
     * @param cb The callback to call whenever data is decoded
     */
    function DecodeUTF8(cb) {
        this.ondata = cb;
        if (tds)
            this.t = new TextDecoder();
        else
            this.p = et;
    }
    /**
     * Pushes a chunk to be decoded from UTF-8 binary
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    DecodeUTF8.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        final = !!final;
        if (this.t) {
            this.ondata(this.t.decode(chunk, { stream: true }), final);
            if (final) {
                if (this.t.decode().length)
                    err(8);
                this.t = null;
            }
            return;
        }
        if (!this.p)
            err(4);
        var dat = new u8(this.p.length + chunk.length);
        dat.set(this.p);
        dat.set(chunk, this.p.length);
        var _a = dutf8(dat), ch = _a[0], np = _a[1];
        if (final) {
            if (np.length)
                err(8);
            this.p = null;
        }
        else
            this.p = np;
        this.ondata(ch, final);
    };
    return DecodeUTF8;
}());
exports.DecodeUTF8 = DecodeUTF8;
/**
 * Streaming UTF-8 encoding
 */
var EncodeUTF8 = /*#__PURE__*/ (function () {
    /**
     * Creates a UTF-8 decoding stream
     * @param cb The callback to call whenever data is encoded
     */
    function EncodeUTF8(cb) {
        this.ondata = cb;
    }
    /**
     * Pushes a chunk to be encoded to UTF-8
     * @param chunk The string data to push
     * @param final Whether this is the last chunk
     */
    EncodeUTF8.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        if (this.d)
            err(4);
        this.ondata(strToU8(chunk), this.d = final || false);
    };
    return EncodeUTF8;
}());
exports.EncodeUTF8 = EncodeUTF8;
/**
 * Converts a string into a Uint8Array for use with compression/decompression methods
 * @param str The string to encode
 * @param latin1 Whether or not to interpret the data as Latin-1. This should
 *               not need to be true unless decoding a binary string.
 * @returns The string encoded in UTF-8/Latin-1 binary
 */
function strToU8(str, latin1) {
    if (latin1) {
        var ar_1 = new u8(str.length);
        for (var i = 0; i < str.length; ++i)
            ar_1[i] = str.charCodeAt(i);
        return ar_1;
    }
    if (te)
        return te.encode(str);
    var l = str.length;
    var ar = new u8(str.length + (str.length >> 1));
    var ai = 0;
    var w = function (v) { ar[ai++] = v; };
    for (var i = 0; i < l; ++i) {
        if (ai + 5 > ar.length) {
            var n = new u8(ai + 8 + ((l - i) << 1));
            n.set(ar);
            ar = n;
        }
        var c = str.charCodeAt(i);
        if (c < 128 || latin1)
            w(c);
        else if (c < 2048)
            w(192 | (c >> 6)), w(128 | (c & 63));
        else if (c > 55295 && c < 57344)
            c = 65536 + (c & 1023 << 10) | (str.charCodeAt(++i) & 1023),
                w(240 | (c >> 18)), w(128 | ((c >> 12) & 63)), w(128 | ((c >> 6) & 63)), w(128 | (c & 63));
        else
            w(224 | (c >> 12)), w(128 | ((c >> 6) & 63)), w(128 | (c & 63));
    }
    return slc(ar, 0, ai);
}
exports.strToU8 = strToU8;
/**
 * Converts a Uint8Array to a string
 * @param dat The data to decode to string
 * @param latin1 Whether or not to interpret the data as Latin-1. This should
 *               not need to be true unless encoding to binary string.
 * @returns The original UTF-8/Latin-1 string
 */
function strFromU8(dat, latin1) {
    if (latin1) {
        var r = '';
        for (var i = 0; i < dat.length; i += 16384)
            r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
        return r;
    }
    else if (td)
        return td.decode(dat);
    else {
        var _a = dutf8(dat), out = _a[0], ext = _a[1];
        if (ext.length)
            err(8);
        return out;
    }
}
exports.strFromU8 = strFromU8;
;
// deflate bit flag
var dbf = function (l) { return l == 1 ? 3 : l < 6 ? 2 : l == 9 ? 1 : 0; };
// skip local zip header
var slzh = function (d, b) { return b + 30 + b2(d, b + 26) + b2(d, b + 28); };
// read zip header
var zh = function (d, b, z) {
    var fnl = b2(d, b + 28), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl, bs = b4(d, b + 20);
    var _a = z && bs == 4294967295 ? z64e(d, es) : [bs, b4(d, b + 24), b4(d, b + 42)], sc = _a[0], su = _a[1], off = _a[2];
    return [b2(d, b + 10), sc, su, fn, es + b2(d, b + 30) + b2(d, b + 32), off];
};
// read zip64 extra field
var z64e = function (d, b) {
    for (; b2(d, b) != 1; b += 4 + b2(d, b + 2))
        ;
    return [b8(d, b + 12), b8(d, b + 4), b8(d, b + 20)];
};
// extra field length
var exfl = function (ex) {
    var le = 0;
    if (ex) {
        for (var k in ex) {
            var l = ex[k].length;
            if (l > 65535)
                err(9);
            le += l + 4;
        }
    }
    return le;
};
// write zip header
var wzh = function (d, b, f, fn, u, c, ce, co) {
    var fl = fn.length, ex = f.extra, col = co && co.length;
    var exl = exfl(ex);
    wbytes(d, b, ce != null ? 0x2014B50 : 0x4034B50), b += 4;
    if (ce != null)
        d[b++] = 20, d[b++] = f.os;
    d[b] = 20, b += 2; // spec compliance? what's that?
    d[b++] = (f.flag << 1) | (c == null && 8), d[b++] = u && 8;
    d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
    var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
    if (y < 0 || y > 119)
        err(10);
    wbytes(d, b, (y << 25) | ((dt.getMonth() + 1) << 21) | (dt.getDate() << 16) | (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >>> 1)), b += 4;
    if (c != null) {
        wbytes(d, b, f.crc);
        wbytes(d, b + 4, c);
        wbytes(d, b + 8, f.size);
    }
    wbytes(d, b + 12, fl);
    wbytes(d, b + 14, exl), b += 16;
    if (ce != null) {
        wbytes(d, b, col);
        wbytes(d, b + 6, f.attrs);
        wbytes(d, b + 10, ce), b += 14;
    }
    d.set(fn, b);
    b += fl;
    if (exl) {
        for (var k in ex) {
            var exf = ex[k], l = exf.length;
            wbytes(d, b, +k);
            wbytes(d, b + 2, l);
            d.set(exf, b + 4), b += 4 + l;
        }
    }
    if (col)
        d.set(co, b), b += col;
    return b;
};
// write zip footer (end of central directory)
var wzf = function (o, b, c, d, e) {
    wbytes(o, b, 0x6054B50); // skip disk
    wbytes(o, b + 8, c);
    wbytes(o, b + 10, c);
    wbytes(o, b + 12, d);
    wbytes(o, b + 16, e);
};
/**
 * A pass-through stream to keep data uncompressed in a ZIP archive.
 */
var ZipPassThrough = /*#__PURE__*/ (function () {
    /**
     * Creates a pass-through stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     */
    function ZipPassThrough(filename) {
        this.filename = filename;
        this.c = crc();
        this.size = 0;
        this.compression = 0;
    }
    /**
     * Processes a chunk and pushes to the output stream. You can override this
     * method in a subclass for custom behavior, but by default this passes
     * the data through. You must call this.ondata(err, chunk, final) at some
     * point in this method.
     * @param chunk The chunk to process
     * @param final Whether this is the last chunk
     */
    ZipPassThrough.prototype.process = function (chunk, final) {
        this.ondata(null, chunk, final);
    };
    /**
     * Pushes a chunk to be added. If you are subclassing this with a custom
     * compression algorithm, note that you must push data from the source
     * file only, pre-compression.
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    ZipPassThrough.prototype.push = function (chunk, final) {
        if (!this.ondata)
            err(5);
        this.c.p(chunk);
        this.size += chunk.length;
        if (final)
            this.crc = this.c.d();
        this.process(chunk, final || false);
    };
    return ZipPassThrough;
}());
exports.ZipPassThrough = ZipPassThrough;
// I don't extend because TypeScript extension adds 1kB of runtime bloat
/**
 * Streaming DEFLATE compression for ZIP archives. Prefer using AsyncZipDeflate
 * for better performance
 */
var ZipDeflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     * @param opts The compression options
     */
    function ZipDeflate(filename, opts) {
        var _this_1 = this;
        if (!opts)
            opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new Deflate(opts, function (dat, final) {
            _this_1.ondata(null, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
    }
    ZipDeflate.prototype.process = function (chunk, final) {
        try {
            this.d.push(chunk, final);
        }
        catch (e) {
            this.ondata(e, null, final);
        }
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    ZipDeflate.prototype.push = function (chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
    };
    return ZipDeflate;
}());
exports.ZipDeflate = ZipDeflate;
/**
 * Asynchronous streaming DEFLATE compression for ZIP archives
 */
var AsyncZipDeflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE stream that can be added to ZIP archives
     * @param filename The filename to associate with this data stream
     * @param opts The compression options
     */
    function AsyncZipDeflate(filename, opts) {
        var _this_1 = this;
        if (!opts)
            opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new AsyncDeflate(opts, function (err, dat, final) {
            _this_1.ondata(err, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
        this.terminate = this.d.terminate;
    }
    AsyncZipDeflate.prototype.process = function (chunk, final) {
        this.d.push(chunk, final);
    };
    /**
     * Pushes a chunk to be deflated
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    AsyncZipDeflate.prototype.push = function (chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
    };
    return AsyncZipDeflate;
}());
exports.AsyncZipDeflate = AsyncZipDeflate;
// TODO: Better tree shaking
/**
 * A zippable archive to which files can incrementally be added
 */
var Zip = /*#__PURE__*/ (function () {
    /**
     * Creates an empty ZIP archive to which files can be added
     * @param cb The callback to call whenever data for the generated ZIP archive
     *           is available
     */
    function Zip(cb) {
        this.ondata = cb;
        this.u = [];
        this.d = 1;
    }
    /**
     * Adds a file to the ZIP archive
     * @param file The file stream to add
     */
    Zip.prototype.add = function (file) {
        var _this_1 = this;
        if (!this.ondata)
            err(5);
        // finishing or finished
        if (this.d & 2)
            this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, false);
        else {
            var f = strToU8(file.filename), fl_1 = f.length;
            var com = file.comment, o = com && strToU8(com);
            var u = fl_1 != file.filename.length || (o && (com.length != o.length));
            var hl_1 = fl_1 + exfl(file.extra) + 30;
            if (fl_1 > 65535)
                this.ondata(err(11, 0, 1), null, false);
            var header = new u8(hl_1);
            wzh(header, 0, file, f, u);
            var chks_1 = [header];
            var pAll_1 = function () {
                for (var _i = 0, chks_2 = chks_1; _i < chks_2.length; _i++) {
                    var chk = chks_2[_i];
                    _this_1.ondata(null, chk, false);
                }
                chks_1 = [];
            };
            var tr_1 = this.d;
            this.d = 0;
            var ind_1 = this.u.length;
            var uf_1 = mrg(file, {
                f: f,
                u: u,
                o: o,
                t: function () {
                    if (file.terminate)
                        file.terminate();
                },
                r: function () {
                    pAll_1();
                    if (tr_1) {
                        var nxt = _this_1.u[ind_1 + 1];
                        if (nxt)
                            nxt.r();
                        else
                            _this_1.d = 1;
                    }
                    tr_1 = 1;
                }
            });
            var cl_1 = 0;
            file.ondata = function (err, dat, final) {
                if (err) {
                    _this_1.ondata(err, dat, final);
                    _this_1.terminate();
                }
                else {
                    cl_1 += dat.length;
                    chks_1.push(dat);
                    if (final) {
                        var dd = new u8(16);
                        wbytes(dd, 0, 0x8074B50);
                        wbytes(dd, 4, file.crc);
                        wbytes(dd, 8, cl_1);
                        wbytes(dd, 12, file.size);
                        chks_1.push(dd);
                        uf_1.c = cl_1, uf_1.b = hl_1 + cl_1 + 16, uf_1.crc = file.crc, uf_1.size = file.size;
                        if (tr_1)
                            uf_1.r();
                        tr_1 = 1;
                    }
                    else if (tr_1)
                        pAll_1();
                }
            };
            this.u.push(uf_1);
        }
    };
    /**
     * Ends the process of adding files and prepares to emit the final chunks.
     * This *must* be called after adding all desired files for the resulting
     * ZIP file to work properly.
     */
    Zip.prototype.end = function () {
        var _this_1 = this;
        if (this.d & 2) {
            this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, true);
            return;
        }
        if (this.d)
            this.e();
        else
            this.u.push({
                r: function () {
                    if (!(_this_1.d & 1))
                        return;
                    _this_1.u.splice(-1, 1);
                    _this_1.e();
                },
                t: function () { }
            });
        this.d = 3;
    };
    Zip.prototype.e = function () {
        var bt = 0, l = 0, tl = 0;
        for (var _i = 0, _a = this.u; _i < _a.length; _i++) {
            var f = _a[_i];
            tl += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0);
        }
        var out = new u8(tl + 22);
        for (var _b = 0, _c = this.u; _b < _c.length; _b++) {
            var f = _c[_b];
            wzh(out, bt, f, f.f, f.u, f.c, l, f.o);
            bt += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0), l += f.b;
        }
        wzf(out, bt, this.u.length, tl, l);
        this.ondata(null, out, true);
        this.d = 2;
    };
    /**
     * A method to terminate any internal workers used by the stream. Subsequent
     * calls to add() will fail.
     */
    Zip.prototype.terminate = function () {
        for (var _i = 0, _a = this.u; _i < _a.length; _i++) {
            var f = _a[_i];
            f.t();
        }
        this.d = 2;
    };
    return Zip;
}());
exports.Zip = Zip;
function zip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    var r = {};
    fltn(data, '', r, opts);
    var k = Object.keys(r);
    var lft = k.length, o = 0, tot = 0;
    var slft = lft, files = new Array(lft);
    var term = [];
    var tAll = function () {
        for (var i = 0; i < term.length; ++i)
            term[i]();
    };
    var cbd = function (a, b) {
        mt(function () { cb(a, b); });
    };
    mt(function () { cbd = cb; });
    var cbf = function () {
        var out = new u8(tot + 22), oe = o, cdl = tot - o;
        tot = 0;
        for (var i = 0; i < slft; ++i) {
            var f = files[i];
            try {
                var l = f.c.length;
                wzh(out, tot, f, f.f, f.u, l);
                var badd = 30 + f.f.length + exfl(f.extra);
                var loc = tot + badd;
                out.set(f.c, loc);
                wzh(out, o, f, f.f, f.u, l, tot, f.m), o += 16 + badd + (f.m ? f.m.length : 0), tot = loc + l;
            }
            catch (e) {
                return cbd(e, null);
            }
        }
        wzf(out, o, files.length, cdl, oe);
        cbd(null, out);
    };
    if (!lft)
        cbf();
    var _loop_1 = function (i) {
        var fn = k[i];
        var _a = r[fn], file = _a[0], p = _a[1];
        var c = crc(), size = file.length;
        c.p(file);
        var f = strToU8(fn), s = f.length;
        var com = p.comment, m = com && strToU8(com), ms = m && m.length;
        var exl = exfl(p.extra);
        var compression = p.level == 0 ? 0 : 8;
        var cbl = function (e, d) {
            if (e) {
                tAll();
                cbd(e, null);
            }
            else {
                var l = d.length;
                files[i] = mrg(p, {
                    size: size,
                    crc: c.d(),
                    c: d,
                    f: f,
                    m: m,
                    u: s != fn.length || (m && (com.length != ms)),
                    compression: compression
                });
                o += 30 + s + exl + l;
                tot += 76 + 2 * (s + exl) + (ms || 0) + l;
                if (!--lft)
                    cbf();
            }
        };
        if (s > 65535)
            cbl(err(11, 0, 1), null);
        if (!compression)
            cbl(null, file);
        else if (size < 160000) {
            try {
                cbl(null, deflateSync(file, p));
            }
            catch (e) {
                cbl(e, null);
            }
        }
        else
            term.push(deflate(file, p, cbl));
    };
    // Cannot use lft because it can decrease
    for (var i = 0; i < slft; ++i) {
        _loop_1(i);
    }
    return tAll;
}
exports.zip = zip;
/**
 * Synchronously creates a ZIP file. Prefer using `zip` for better performance
 * with more than one file.
 * @param data The directory structure for the ZIP archive
 * @param opts The main options, merged with per-file options
 * @returns The generated ZIP archive
 */
function zipSync(data, opts) {
    if (!opts)
        opts = {};
    var r = {};
    var files = [];
    fltn(data, '', r, opts);
    var o = 0;
    var tot = 0;
    for (var fn in r) {
        var _a = r[fn], file = _a[0], p = _a[1];
        var compression = p.level == 0 ? 0 : 8;
        var f = strToU8(fn), s = f.length;
        var com = p.comment, m = com && strToU8(com), ms = m && m.length;
        var exl = exfl(p.extra);
        if (s > 65535)
            err(11);
        var d = compression ? deflateSync(file, p) : file, l = d.length;
        var c = crc();
        c.p(file);
        files.push(mrg(p, {
            size: file.length,
            crc: c.d(),
            c: d,
            f: f,
            m: m,
            u: s != fn.length || (m && (com.length != ms)),
            o: o,
            compression: compression
        }));
        o += 30 + s + exl + l;
        tot += 76 + 2 * (s + exl) + (ms || 0) + l;
    }
    var out = new u8(tot + 22), oe = o, cdl = tot - o;
    for (var i = 0; i < files.length; ++i) {
        var f = files[i];
        wzh(out, f.o, f, f.f, f.u, f.c.length);
        var badd = 30 + f.f.length + exfl(f.extra);
        out.set(f.c, f.o + badd);
        wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
    }
    wzf(out, o, files.length, cdl, oe);
    return out;
}
exports.zipSync = zipSync;
/**
 * Streaming pass-through decompression for ZIP archives
 */
var UnzipPassThrough = /*#__PURE__*/ (function () {
    function UnzipPassThrough() {
    }
    UnzipPassThrough.prototype.push = function (data, final) {
        this.ondata(null, data, final);
    };
    UnzipPassThrough.compression = 0;
    return UnzipPassThrough;
}());
exports.UnzipPassThrough = UnzipPassThrough;
/**
 * Streaming DEFLATE decompression for ZIP archives. Prefer AsyncZipInflate for
 * better performance.
 */
var UnzipInflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE decompression that can be used in ZIP archives
     */
    function UnzipInflate() {
        var _this_1 = this;
        this.i = new Inflate(function (dat, final) {
            _this_1.ondata(null, dat, final);
        });
    }
    UnzipInflate.prototype.push = function (data, final) {
        try {
            this.i.push(data, final);
        }
        catch (e) {
            this.ondata(e, null, final);
        }
    };
    UnzipInflate.compression = 8;
    return UnzipInflate;
}());
exports.UnzipInflate = UnzipInflate;
/**
 * Asynchronous streaming DEFLATE decompression for ZIP archives
 */
var AsyncUnzipInflate = /*#__PURE__*/ (function () {
    /**
     * Creates a DEFLATE decompression that can be used in ZIP archives
     */
    function AsyncUnzipInflate(_, sz) {
        var _this_1 = this;
        if (sz < 320000) {
            this.i = new Inflate(function (dat, final) {
                _this_1.ondata(null, dat, final);
            });
        }
        else {
            this.i = new AsyncInflate(function (err, dat, final) {
                _this_1.ondata(err, dat, final);
            });
            this.terminate = this.i.terminate;
        }
    }
    AsyncUnzipInflate.prototype.push = function (data, final) {
        if (this.i.terminate)
            data = slc(data, 0);
        this.i.push(data, final);
    };
    AsyncUnzipInflate.compression = 8;
    return AsyncUnzipInflate;
}());
exports.AsyncUnzipInflate = AsyncUnzipInflate;
/**
 * A ZIP archive decompression stream that emits files as they are discovered
 */
var Unzip = /*#__PURE__*/ (function () {
    /**
     * Creates a ZIP decompression stream
     * @param cb The callback to call whenever a file in the ZIP archive is found
     */
    function Unzip(cb) {
        this.onfile = cb;
        this.k = [];
        this.o = {
            0: UnzipPassThrough
        };
        this.p = et;
    }
    /**
     * Pushes a chunk to be unzipped
     * @param chunk The chunk to push
     * @param final Whether this is the last chunk
     */
    Unzip.prototype.push = function (chunk, final) {
        var _this_1 = this;
        if (!this.onfile)
            err(5);
        if (!this.p)
            err(4);
        if (this.c > 0) {
            var len = Math.min(this.c, chunk.length);
            var toAdd = chunk.subarray(0, len);
            this.c -= len;
            if (this.d)
                this.d.push(toAdd, !this.c);
            else
                this.k[0].push(toAdd);
            chunk = chunk.subarray(len);
            if (chunk.length)
                return this.push(chunk, final);
        }
        else {
            var f = 0, i = 0, is = void 0, buf = void 0;
            if (!this.p.length)
                buf = chunk;
            else if (!chunk.length)
                buf = this.p;
            else {
                buf = new u8(this.p.length + chunk.length);
                buf.set(this.p), buf.set(chunk, this.p.length);
            }
            var l = buf.length, oc = this.c, add = oc && this.d;
            var _loop_2 = function () {
                var _a;
                var sig = b4(buf, i);
                if (sig == 0x4034B50) {
                    f = 1, is = i;
                    this_1.d = null;
                    this_1.c = 0;
                    var bf = b2(buf, i + 6), cmp_1 = b2(buf, i + 8), u = bf & 2048, dd = bf & 8, fnl = b2(buf, i + 26), es = b2(buf, i + 28);
                    if (l > i + 30 + fnl + es) {
                        var chks_3 = [];
                        this_1.k.unshift(chks_3);
                        f = 2;
                        var sc_1 = b4(buf, i + 18), su_1 = b4(buf, i + 22);
                        var fn_1 = strFromU8(buf.subarray(i + 30, i += 30 + fnl), !u);
                        if (sc_1 == 4294967295) {
                            _a = dd ? [-2] : z64e(buf, i), sc_1 = _a[0], su_1 = _a[1];
                        }
                        else if (dd)
                            sc_1 = -1;
                        i += es;
                        this_1.c = sc_1;
                        var d_1;
                        var file_1 = {
                            name: fn_1,
                            compression: cmp_1,
                            start: function () {
                                if (!file_1.ondata)
                                    err(5);
                                if (!sc_1)
                                    file_1.ondata(null, et, true);
                                else {
                                    var ctr = _this_1.o[cmp_1];
                                    if (!ctr)
                                        file_1.ondata(err(14, 'unknown compression type ' + cmp_1, 1), null, false);
                                    d_1 = sc_1 < 0 ? new ctr(fn_1) : new ctr(fn_1, sc_1, su_1);
                                    d_1.ondata = function (err, dat, final) { file_1.ondata(err, dat, final); };
                                    for (var _i = 0, chks_4 = chks_3; _i < chks_4.length; _i++) {
                                        var dat = chks_4[_i];
                                        d_1.push(dat, false);
                                    }
                                    if (_this_1.k[0] == chks_3 && _this_1.c)
                                        _this_1.d = d_1;
                                    else
                                        d_1.push(et, true);
                                }
                            },
                            terminate: function () {
                                if (d_1 && d_1.terminate)
                                    d_1.terminate();
                            }
                        };
                        if (sc_1 >= 0)
                            file_1.size = sc_1, file_1.originalSize = su_1;
                        this_1.onfile(file_1);
                    }
                    return "break";
                }
                else if (oc) {
                    if (sig == 0x8074B50) {
                        is = i += 12 + (oc == -2 && 8), f = 3, this_1.c = 0;
                        return "break";
                    }
                    else if (sig == 0x2014B50) {
                        is = i -= 4, f = 3, this_1.c = 0;
                        return "break";
                    }
                }
            };
            var this_1 = this;
            for (; i < l - 4; ++i) {
                var state_1 = _loop_2();
                if (state_1 === "break")
                    break;
            }
            this.p = et;
            if (oc < 0) {
                var dat = f ? buf.subarray(0, is - 12 - (oc == -2 && 8) - (b4(buf, is - 16) == 0x8074B50 && 4)) : buf.subarray(0, i);
                if (add)
                    add.push(dat, !!f);
                else
                    this.k[+(f == 2)].push(dat);
            }
            if (f & 2)
                return this.push(buf.subarray(i), final);
            this.p = buf.subarray(i);
        }
        if (final) {
            if (this.c)
                err(13);
            this.p = null;
        }
    };
    /**
     * Registers a decoder with the stream, allowing for files compressed with
     * the compression type provided to be expanded correctly
     * @param decoder The decoder constructor
     */
    Unzip.prototype.register = function (decoder) {
        this.o[decoder.compression] = decoder;
    };
    return Unzip;
}());
exports.Unzip = Unzip;
var mt = typeof queueMicrotask == 'function' ? queueMicrotask : typeof setTimeout == 'function' ? setTimeout : function (fn) { fn(); };
function unzip(data, opts, cb) {
    if (!cb)
        cb = opts, opts = {};
    if (typeof cb != 'function')
        err(7);
    var term = [];
    var tAll = function () {
        for (var i = 0; i < term.length; ++i)
            term[i]();
    };
    var files = {};
    var cbd = function (a, b) {
        mt(function () { cb(a, b); });
    };
    mt(function () { cbd = cb; });
    var e = data.length - 22;
    for (; b4(data, e) != 0x6054B50; --e) {
        if (!e || data.length - e > 65558) {
            cbd(err(13, 0, 1), null);
            return tAll;
        }
    }
    ;
    var lft = b2(data, e + 8);
    if (lft) {
        var c = lft;
        var o = b4(data, e + 16);
        var z = o == 4294967295;
        if (z) {
            e = b4(data, e - 12);
            if (b4(data, e) != 0x6064B50) {
                cbd(err(13, 0, 1), null);
                return tAll;
            }
            c = lft = b4(data, e + 32);
            o = b4(data, e + 48);
        }
        var fltr = opts && opts.filter;
        var _loop_3 = function (i) {
            var _a = zh(data, o, z), c_1 = _a[0], sc = _a[1], su = _a[2], fn = _a[3], no = _a[4], off = _a[5], b = slzh(data, off);
            o = no;
            var cbl = function (e, d) {
                if (e) {
                    tAll();
                    cbd(e, null);
                }
                else {
                    if (d)
                        files[fn] = d;
                    if (!--lft)
                        cbd(null, files);
                }
            };
            if (!fltr || fltr({
                name: fn,
                size: sc,
                originalSize: su,
                compression: c_1
            })) {
                if (!c_1)
                    cbl(null, slc(data, b, b + sc));
                else if (c_1 == 8) {
                    var infl = data.subarray(b, b + sc);
                    if (sc < 320000) {
                        try {
                            cbl(null, inflateSync(infl, new u8(su)));
                        }
                        catch (e) {
                            cbl(e, null);
                        }
                    }
                    else
                        term.push(inflate(infl, { size: su }, cbl));
                }
                else
                    cbl(err(14, 'unknown compression type ' + c_1, 1), null);
            }
            else
                cbl(null, null);
        };
        for (var i = 0; i < c; ++i) {
            _loop_3(i);
        }
    }
    else
        cbd(null, {});
    return tAll;
}
exports.unzip = unzip;
/**
 * Synchronously decompresses a ZIP archive. Prefer using `unzip` for better
 * performance with more than one file.
 * @param data The raw compressed ZIP file
 * @param opts The ZIP extraction options
 * @returns The decompressed files
 */
function unzipSync(data, opts) {
    var files = {};
    var e = data.length - 22;
    for (; b4(data, e) != 0x6054B50; --e) {
        if (!e || data.length - e > 65558)
            err(13);
    }
    ;
    var c = b2(data, e + 8);
    if (!c)
        return {};
    var o = b4(data, e + 16);
    var z = o == 4294967295;
    if (z) {
        e = b4(data, e - 12);
        if (b4(data, e) != 0x6064B50)
            err(13);
        c = b4(data, e + 32);
        o = b4(data, e + 48);
    }
    var fltr = opts && opts.filter;
    for (var i = 0; i < c; ++i) {
        var _a = zh(data, o, z), c_2 = _a[0], sc = _a[1], su = _a[2], fn = _a[3], no = _a[4], off = _a[5], b = slzh(data, off);
        o = no;
        if (!fltr || fltr({
            name: fn,
            size: sc,
            originalSize: su,
            compression: c_2
        })) {
            if (!c_2)
                files[fn] = slc(data, b, b + sc);
            else if (c_2 == 8)
                files[fn] = inflateSync(data.subarray(b, b + sc), new u8(su));
            else
                err(14, 'unknown compression type ' + c_2);
        }
    }
    return files;
}
exports.unzipSync = unzipSync;


/***/ }),

/***/ "../node_modules/fflate/lib/worker.cjs":
/*!*********************************************!*\
  !*** ../node_modules/fflate/lib/worker.cjs ***!
  \*********************************************/
/***/ ((__unused_webpack_module, exports) => {


var ch2 = {};
exports["default"] = (function (c, id, msg, transfer, cb) {
    var w = new Worker(ch2[id] || (ch2[id] = URL.createObjectURL(new Blob([
        c + ';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'
    ], { type: 'text/javascript' }))));
    w.onmessage = function (e) {
        var d = e.data, ed = d.$e$;
        if (ed) {
            var err = new Error(ed[0]);
            err['code'] = ed[1];
            err.stack = ed[2];
            cb(err, null);
        }
        else
            cb(null, d);
    };
    w.postMessage(msg, transfer);
    return w;
});


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!******************!*\
  !*** ./index.ts ***!
  \******************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.XmlUtils = exports.VarDictionary = exports.Int64 = exports.ByteUtils = exports.BinaryStream = exports.KdbxUuid = exports.KdbxTimes = exports.KdbxMeta = exports.KdbxHeader = exports.KdbxGroup = exports.KdbxFormat = exports.KdbxEntry = exports.KdbxDeletedObject = exports.KdbxCustomData = exports.Credentials = exports.KdbxCredentials = exports.KdbxContext = exports.KdbxBinaries = exports.Kdbx = exports.KdbxError = exports.XmlNames = exports.Consts = exports.Salsa20 = exports.ProtectedValue = exports.ProtectSaltGenerator = exports.KeyEncryptorKdf = exports.KeyEncryptorAes = exports.HmacBlockTransform = exports.HashedBlockTransform = exports.CryptoEngine = exports.ChaCha20 = void 0;
const chacha20_1 = __webpack_require__(/*! ./crypto/chacha20 */ "./crypto/chacha20.ts");
Object.defineProperty(exports, "ChaCha20", ({ enumerable: true, get: function () { return chacha20_1.ChaCha20; } }));
const CryptoEngine = __webpack_require__(/*! ./crypto/crypto-engine */ "./crypto/crypto-engine.ts");
exports.CryptoEngine = CryptoEngine;
const HashedBlockTransform = __webpack_require__(/*! ./crypto/hashed-block-transform */ "./crypto/hashed-block-transform.ts");
exports.HashedBlockTransform = HashedBlockTransform;
const HmacBlockTransform = __webpack_require__(/*! ./crypto/hmac-block-transform */ "./crypto/hmac-block-transform.ts");
exports.HmacBlockTransform = HmacBlockTransform;
const KeyEncryptorAes = __webpack_require__(/*! ./crypto/key-encryptor-aes */ "./crypto/key-encryptor-aes.ts");
exports.KeyEncryptorAes = KeyEncryptorAes;
const KeyEncryptorKdf = __webpack_require__(/*! ./crypto/key-encryptor-kdf */ "./crypto/key-encryptor-kdf.ts");
exports.KeyEncryptorKdf = KeyEncryptorKdf;
const protect_salt_generator_1 = __webpack_require__(/*! ./crypto/protect-salt-generator */ "./crypto/protect-salt-generator.ts");
Object.defineProperty(exports, "ProtectSaltGenerator", ({ enumerable: true, get: function () { return protect_salt_generator_1.ProtectSaltGenerator; } }));
const protected_value_1 = __webpack_require__(/*! ./crypto/protected-value */ "./crypto/protected-value.ts");
Object.defineProperty(exports, "ProtectedValue", ({ enumerable: true, get: function () { return protected_value_1.ProtectedValue; } }));
const salsa20_1 = __webpack_require__(/*! ./crypto/salsa20 */ "./crypto/salsa20.ts");
Object.defineProperty(exports, "Salsa20", ({ enumerable: true, get: function () { return salsa20_1.Salsa20; } }));
const Consts = __webpack_require__(/*! ./defs/consts */ "./defs/consts.ts");
exports.Consts = Consts;
const XmlNames = __webpack_require__(/*! ./defs/xml-names */ "./defs/xml-names.ts");
exports.XmlNames = XmlNames;
const kdbx_error_1 = __webpack_require__(/*! ./errors/kdbx-error */ "./errors/kdbx-error.ts");
Object.defineProperty(exports, "KdbxError", ({ enumerable: true, get: function () { return kdbx_error_1.KdbxError; } }));
const kdbx_1 = __webpack_require__(/*! ./format/kdbx */ "./format/kdbx.ts");
Object.defineProperty(exports, "Kdbx", ({ enumerable: true, get: function () { return kdbx_1.Kdbx; } }));
const kdbx_binaries_1 = __webpack_require__(/*! ./format/kdbx-binaries */ "./format/kdbx-binaries.ts");
Object.defineProperty(exports, "KdbxBinaries", ({ enumerable: true, get: function () { return kdbx_binaries_1.KdbxBinaries; } }));
const kdbx_context_1 = __webpack_require__(/*! ./format/kdbx-context */ "./format/kdbx-context.ts");
Object.defineProperty(exports, "KdbxContext", ({ enumerable: true, get: function () { return kdbx_context_1.KdbxContext; } }));
const kdbx_credentials_1 = __webpack_require__(/*! ./format/kdbx-credentials */ "./format/kdbx-credentials.ts");
Object.defineProperty(exports, "KdbxCredentials", ({ enumerable: true, get: function () { return kdbx_credentials_1.KdbxCredentials; } }));
Object.defineProperty(exports, "Credentials", ({ enumerable: true, get: function () { return kdbx_credentials_1.KdbxCredentials; } }));
const kdbx_custom_data_1 = __webpack_require__(/*! ./format/kdbx-custom-data */ "./format/kdbx-custom-data.ts");
Object.defineProperty(exports, "KdbxCustomData", ({ enumerable: true, get: function () { return kdbx_custom_data_1.KdbxCustomData; } }));
const kdbx_deleted_object_1 = __webpack_require__(/*! ./format/kdbx-deleted-object */ "./format/kdbx-deleted-object.ts");
Object.defineProperty(exports, "KdbxDeletedObject", ({ enumerable: true, get: function () { return kdbx_deleted_object_1.KdbxDeletedObject; } }));
const kdbx_entry_1 = __webpack_require__(/*! ./format/kdbx-entry */ "./format/kdbx-entry.ts");
Object.defineProperty(exports, "KdbxEntry", ({ enumerable: true, get: function () { return kdbx_entry_1.KdbxEntry; } }));
const kdbx_format_1 = __webpack_require__(/*! ./format/kdbx-format */ "./format/kdbx-format.ts");
Object.defineProperty(exports, "KdbxFormat", ({ enumerable: true, get: function () { return kdbx_format_1.KdbxFormat; } }));
const kdbx_group_1 = __webpack_require__(/*! ./format/kdbx-group */ "./format/kdbx-group.ts");
Object.defineProperty(exports, "KdbxGroup", ({ enumerable: true, get: function () { return kdbx_group_1.KdbxGroup; } }));
const kdbx_header_1 = __webpack_require__(/*! ./format/kdbx-header */ "./format/kdbx-header.ts");
Object.defineProperty(exports, "KdbxHeader", ({ enumerable: true, get: function () { return kdbx_header_1.KdbxHeader; } }));
const kdbx_meta_1 = __webpack_require__(/*! ./format/kdbx-meta */ "./format/kdbx-meta.ts");
Object.defineProperty(exports, "KdbxMeta", ({ enumerable: true, get: function () { return kdbx_meta_1.KdbxMeta; } }));
const kdbx_times_1 = __webpack_require__(/*! ./format/kdbx-times */ "./format/kdbx-times.ts");
Object.defineProperty(exports, "KdbxTimes", ({ enumerable: true, get: function () { return kdbx_times_1.KdbxTimes; } }));
const kdbx_uuid_1 = __webpack_require__(/*! ./format/kdbx-uuid */ "./format/kdbx-uuid.ts");
Object.defineProperty(exports, "KdbxUuid", ({ enumerable: true, get: function () { return kdbx_uuid_1.KdbxUuid; } }));
const binary_stream_1 = __webpack_require__(/*! ./utils/binary-stream */ "./utils/binary-stream.ts");
Object.defineProperty(exports, "BinaryStream", ({ enumerable: true, get: function () { return binary_stream_1.BinaryStream; } }));
const ByteUtils = __webpack_require__(/*! ./utils/byte-utils */ "./utils/byte-utils.ts");
exports.ByteUtils = ByteUtils;
const int64_1 = __webpack_require__(/*! ./utils/int64 */ "./utils/int64.ts");
Object.defineProperty(exports, "Int64", ({ enumerable: true, get: function () { return int64_1.Int64; } }));
const var_dictionary_1 = __webpack_require__(/*! ./utils/var-dictionary */ "./utils/var-dictionary.ts");
Object.defineProperty(exports, "VarDictionary", ({ enumerable: true, get: function () { return var_dictionary_1.VarDictionary; } }));
const XmlUtils = __webpack_require__(/*! ./utils/xml-utils */ "./utils/xml-utils.ts");
exports.XmlUtils = XmlUtils;

})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=kdbxweb.js.map