import { Wallet } from 'xrpl';
import { privateKeyToAccount } from 'viem/accounts';
import { appendFileSync, existsSync, readFileSync } from 'fs';

const ENV_PATH = '.env';

// Generate random private key for Flare
function generateFlareWallet() {
  const privateKey = `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}` as `0x${string}`;

  const account = privateKeyToAccount(privateKey);
  return { address: account.address, privateKey };
}

// Read existing .env content
let envContent = '';
if (existsSync(ENV_PATH)) {
  envContent = readFileSync(ENV_PATH, 'utf-8');
}

console.log('='.repeat(50));
console.log('Generating Wallets');
console.log('='.repeat(50));

// Generate Flare wallet if not exists
if (!envContent.includes('FLARE_OPERATOR_PRIVATE_KEY=0x')) {
  const flare = generateFlareWallet();
  console.log('\nFlare Operator Wallet:');
  console.log(`  Address: ${flare.address}`);
  console.log(`  Private Key: ${flare.privateKey}`);

  appendFileSync(ENV_PATH, `\n# Flare Operator (generated)\nFLARE_OPERATOR_PRIVATE_KEY=${flare.privateKey}\n`);
  console.log('\n✓ Added to .env');
  console.log(`\n⚠️  Fund this address with C2FLR: https://faucet.flare.network`);
  console.log(`   Address to fund: ${flare.address}`);
} else {
  console.log('\nFlare wallet already configured in .env');
}

console.log('\n' + '='.repeat(50));
