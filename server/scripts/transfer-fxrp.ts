/**
 * Transfer FXRP tokens to a recipient address
 *
 * Usage:
 *   bun run scripts/transfer-fxrp.ts <recipient_address> <amount>
 *
 * Example:
 *   bun run scripts/transfer-fxrp.ts 0x1234...5678 0.1
 */

import { createPublicClient, createWalletClient, http, parseAbi, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config({
  path: './.env',
});

const COSTON2_RPC = process.env.FLARE_RPC_URL || 'https://coston2-api.flare.network/ext/bc/C/rpc';
const FXRP_TOKEN_ADDRESS = process.env.FXRP_TOKEN_ADDRESS as Address;
const OPERATOR_PRIVATE_KEY = process.env.FLARE_OPERATOR_PRIVATE_KEY as `0x${string}`;

if (!FXRP_TOKEN_ADDRESS) {
  console.error('Error: FXRP_TOKEN_ADDRESS not set in .env');
  process.exit(1);
}

if (!OPERATOR_PRIVATE_KEY) {
  console.error('Error: FLARE_OPERATOR_PRIVATE_KEY not set in .env');
  process.exit(1);
}

const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

// Coston2 chain config
const coston2 = {
  id: 114,
  name: 'Coston2',
  network: 'coston2',
  nativeCurrency: { name: 'Coston2 Flare', symbol: 'C2FLR', decimals: 18 },
  rpcUrls: {
    default: { http: [COSTON2_RPC] },
    public: { http: [COSTON2_RPC] },
  },
  blockExplorers: {
    default: { name: 'Coston2 Explorer', url: 'https://coston2-explorer.flare.network' },
  },
} as const;

const account = privateKeyToAccount(OPERATOR_PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: coston2,
  transport: http(COSTON2_RPC),
});

const walletClient = createWalletClient({
  account,
  chain: coston2,
  transport: http(COSTON2_RPC),
});

async function transferFXRP(toAddress: string, amount: string) {
  console.log('='.repeat(60));
  console.log('FXRP Transfer Script - Coston2 Testnet');
  console.log('='.repeat(60));

  console.log(`\nFrom (Operator): ${account.address}`);
  console.log(`To (Recipient): ${toAddress}`);
  console.log(`Amount: ${amount} FXRP`);
  console.log(`Token Contract: ${FXRP_TOKEN_ADDRESS}`);

  // Get token decimals
  const decimals = await publicClient.readContract({
    address: FXRP_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'decimals',
  }) as number;

  console.log(`\nToken Decimals: ${decimals}`);

  // Check operator's FXRP balance
  const operatorBalance = await publicClient.readContract({
    address: FXRP_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;

  const operatorBalanceFormatted = (Number(operatorBalance) / 10 ** decimals).toFixed(6);
  console.log(`\nOperator FXRP Balance: ${operatorBalanceFormatted}`);

  // Convert amount to wei
  const amountWei = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));

  if (operatorBalance < amountWei) {
    console.error(`\nError: Insufficient FXRP balance. Have ${operatorBalanceFormatted}, need ${amount}`);
    process.exit(1);
  }

  console.log(`\nSimulating transfer...`);

  // Simulate first
  const { request } = await publicClient.simulateContract({
    address: FXRP_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [toAddress as Address, amountWei],
    account,
  });

  console.log(`Simulation successful. Executing transfer...`);

  // Execute
  const hash = await walletClient.writeContract(request);
  console.log(`\nTransaction submitted: ${hash}`);

  // Wait for confirmation
  console.log(`Waiting for confirmation...`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TRANSFER SUCCESSFUL`);
  console.log(`TX Hash: ${hash}`);
  console.log(`Explorer: https://coston2-explorer.flare.network/tx/${hash}`);
  console.log(`${'='.repeat(60)}`);
}

// Get arguments
const recipientAddress = process.argv[2];
const amount = process.argv[3];

if (!recipientAddress || !amount) {
  console.error('Usage: bun run scripts/transfer-fxrp.ts <recipient_address> <amount>');
  console.error('Example: bun run scripts/transfer-fxrp.ts 0x1234...5678 0.1');
  process.exit(1);
}

transferFXRP(recipientAddress, amount).catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
