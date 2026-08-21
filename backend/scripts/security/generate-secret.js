const crypto = require("crypto");

const bytes = 64; // 512 bits

const secret = crypto.randomBytes(bytes).toString("base64url");

console.log("\nGenerated secret:\n");
console.log(secret);
console.log(`\nLength: ${secret.length} characters`);
console.log(`Entropy: ${bytes * 8} bits\n`);