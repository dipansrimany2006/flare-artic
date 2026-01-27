/**
 * Check FXRP and C2FLR balance of any wallet address
 *
 * Usage:
 *   bun run scripts/check-balance.ts <wallet_address>
 *
 * Example:
 *   bun run scripts/check-balance.ts 0xba4656dDdb8A51593110e59A39B840DE84B30F1c
 */

import { createPublicClient, http, parseAbi, type Address } from 'viem';
import dotenv from "dotenv"

dotenv.config({
  path: "./.env"
});

const COSTON2_RPC = process.env.FLARE_RPC_URL
const FXRP_TOKEN_ADDRESS = process.env.FXRP_TOKEN_ADDRESS as Address;

const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
]);

const client = createPublicClient({
  transport: http(COSTON2_RPC),
});

async function checkBalance(walletAddress: string) {
  if (!walletAddress || !walletAddress.startsWith('0x')) {
    console.error('Error: Please provide a valid wallet address starting with 0x');
    console.log('\nUsage: bun run scripts/check-balance.ts <wallet_address>');
    process.exit(1);
  }

  const address = walletAddress as Address;

  console.log('='.repeat(60));
  console.log('Wallet Balance Checker - Coston2 Testnet');
  console.log('='.repeat(60));
  console.log(`\nWallet: ${address}`);
  console.log(`Explorer: https://coston2-explorer.flare.network/address/${address}\n`);

  try {
    // Check native C2FLR balance
    const nativeBalance = await client.getBalance({ address });
    const c2flrBalance = (Number(nativeBalance) / 1e18).toFixed(6);
    console.log(`C2FLR (Native): ${c2flrBalance}`);

    // Check FXRP balance
    if (FXRP_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      try {
        const [balance, symbol, decimals, name] = await Promise.all([
          client.readContract({
            address: FXRP_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
          client.readContract({
            address: FXRP_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'symbol',
          }),
          client.readContract({
            address: FXRP_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'decimals',
          }),
          client.readContract({
            address: FXRP_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'name',
          }),
        ]);

        const tokenBalance = (Number(balance) / 10 ** Number(decimals)).toFixed(6);
        console.log(`${symbol} (${name}): ${tokenBalance}`);
        console.log(`\nToken Contract: ${FXRP_TOKEN_ADDRESS}`);
      } catch (error: any) {
        console.log(`FXRP Token: Error reading - ${error.message}`);
      }
    } else {
      console.log('FXRP Token: Not configured (set FXRP_TOKEN_ADDRESS in .env)');
    }

    console.log('\n' + '='.repeat(60));
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Get wallet address from command line argument
const walletAddress = process.argv[2];
checkBalance(walletAddress);
