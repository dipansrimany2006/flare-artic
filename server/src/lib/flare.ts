import { createPublicClient, createWalletClient, http, parseAbi, type Address, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { flareTestnet } from 'viem/chains';
import { decodeAccountID } from 'xrpl';

// Coston2 testnet config
const COSTON2_RPC = process.env.FLARE_RPC_URL || 'https://coston2-api.flare.network/ext/bc/C/rpc';

// Contract addresses
export const FLARE_CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as const;
export const MASTER_ACCOUNT_CONTROLLER = '0x3ab31E2d943d1E8F47B275605E50Ff107f2F8393' as const;
export const FIRELIGHT_VAULT = '0x91Bfe6A68aB035DFebb6A770FFfB748C03C0E40B' as const;
export const FXRP_TOKEN_ADDRESS = (process.env.FXRP_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// ABIs
const CONTRACT_REGISTRY_ABI = parseAbi([
  'function getContractAddressByName(string _name) view returns (address)',
  'function getAllContracts() view returns (string[] memory, address[] memory)',
]);

const MASTER_ACCOUNT_CONTROLLER_ABI = parseAbi([
  'function executeTransaction(bytes calldata _proof, address _xrplAddress) external',
  'function getSmartAccount(address _xrplAddress) view returns (address)',
  'function smartAccounts(address) view returns (address)',
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

// Coston2 chain definition
const coston2 = {
  ...flareTestnet,
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

let publicClient: ReturnType<typeof createPublicClient> | null = null;
let walletClient: ReturnType<typeof createWalletClient> | null = null;
let operatorAccount: ReturnType<typeof privateKeyToAccount> | null = null;

export function getPublicClient() {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: coston2,
      transport: http(COSTON2_RPC),
    });
  }
  return publicClient;
}

export function getWalletClient() {
  if (!walletClient) {
    const privateKey = process.env.FLARE_OPERATOR_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('FLARE_OPERATOR_PRIVATE_KEY not set');
    }
    operatorAccount = privateKeyToAccount(privateKey as `0x${string}`);
    walletClient = createWalletClient({
      account: operatorAccount,
      chain: coston2,
      transport: http(COSTON2_RPC),
    });
  }
  return walletClient;
}

export function getOperatorAccount() {
  if (!operatorAccount) {
    getWalletClient(); // Initialize account
  }
  return operatorAccount!;
}

export async function getContractAddress(name: string): Promise<Address> {
  const client = getPublicClient();
  const address = await client.readContract({
    address: FLARE_CONTRACT_REGISTRY,
    abi: CONTRACT_REGISTRY_ABI,
    functionName: 'getContractAddressByName',
    args: [name],
  });
  return address as Address;
}

export async function getSmartAccount(xrplAddress: string): Promise<Address | null> {
  const client = getPublicClient();
  try {
    // Convert XRPL address to bytes20/address format
    // XRPL addresses need to be converted to Flare address format
    const xrplAddressBytes = xrplAddressToBytes(xrplAddress);

    const smartAccount = await client.readContract({
      address: MASTER_ACCOUNT_CONTROLLER,
      abi: MASTER_ACCOUNT_CONTROLLER_ABI,
      functionName: 'smartAccounts',
      args: [xrplAddressBytes as Address],
    });

    if (smartAccount === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return smartAccount as Address;
  } catch (error: any) {
    // Expected error when user has no smart account yet
    if (error.shortMessage?.includes('reverted')) {
      return null;
    }
    console.error('[Flare] Error getting smart account:', error.shortMessage || error.message);
    return null;
  }
}

export async function executeTransaction(proof: `0x${string}`, xrplAddress: string): Promise<Hash> {
  const wallet = getWalletClient();
  const account = getOperatorAccount();
  const client = getPublicClient();

  const xrplAddressBytes = xrplAddressToBytes(xrplAddress);

  // Simulate first
  const { request } = await client.simulateContract({
    address: MASTER_ACCOUNT_CONTROLLER,
    abi: MASTER_ACCOUNT_CONTROLLER_ABI,
    functionName: 'executeTransaction',
    args: [proof, xrplAddressBytes as Address],
    account,
  });

  // Execute
  const hash = await wallet.writeContract(request);
  console.log(`[Flare] Transaction submitted: ${hash}`);

  // Wait for confirmation
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`[Flare] Transaction confirmed in block ${receipt.blockNumber}`);

  return hash;
}

export async function getTokenBalance(tokenAddress: Address, ownerAddress: Address): Promise<string> {
  const client = getPublicClient();

  const [balance, decimals] = await Promise.all([
    client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [ownerAddress],
    }),
    client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    }),
  ]);

  return formatTokenBalance(balance as bigint, decimals as number);
}

export async function getOperatorFlareBalance(): Promise<string> {
  const client = getPublicClient();
  const account = getOperatorAccount();
  const balance = await client.getBalance({ address: account.address });
  return formatTokenBalance(balance, 18);
}

/**
 * Transfer FXRP tokens from platform wallet to a recipient address
 * @param toAddress - The recipient's address (user's Smart Account)
 * @param amountXRP - Amount in XRP (will be converted to FXRP with correct decimals)
 * @returns Transaction hash
 */
export async function transferFXRP(toAddress: Address, amountXRP: string): Promise<Hash> {
  if (FXRP_TOKEN_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('FXRP_TOKEN_ADDRESS not configured. Set it in environment variables.');
  }

  const wallet = getWalletClient();
  const account = getOperatorAccount();
  const client = getPublicClient();

  // Get actual decimals from token contract (FXRP uses 6 decimals like XRP)
  const decimals = await client.readContract({
    address: FXRP_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'decimals',
  }) as number;

  const amount = BigInt(Math.floor(parseFloat(amountXRP) * 10 ** decimals));

  console.log(`[Flare] Transferring ${amountXRP} FXRP to ${toAddress} (decimals: ${decimals})`);

  // Check platform's FXRP balance first
  const platformBalance = await client.readContract({
    address: FXRP_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;

  if (platformBalance < amount) {
    const balanceStr = formatTokenBalance(platformBalance, decimals);
    throw new Error(`Insufficient FXRP balance. Platform has ${balanceStr} FXRP, need ${amountXRP} FXRP`);
  }

  // Simulate the transfer first
  const { request } = await client.simulateContract({
    address: FXRP_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [toAddress, amount],
    account,
  });

  // Execute the transfer
  const hash = await wallet.writeContract(request);
  console.log(`[Flare] FXRP transfer submitted: ${hash}`);

  // Wait for confirmation
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`[Flare] FXRP transfer confirmed in block ${receipt.blockNumber}`);

  return hash;
}

/**
 * Get platform's FXRP balance
 */
export async function getPlatformFXRPBalance(): Promise<string> {
  if (FXRP_TOKEN_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return '0';
  }

  const client = getPublicClient();
  const account = getOperatorAccount();

  const [balance, decimals] = await Promise.all([
    client.readContract({
      address: FXRP_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    }),
    client.readContract({
      address: FXRP_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'decimals',
    }),
  ]);

  return formatTokenBalance(balance as bigint, decimals as number);
}

function formatTokenBalance(balance: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = balance / divisor;
  const fractionalPart = balance % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 6);
  return `${integerPart}.${fractionalStr}`;
}

// Convert XRPL address to bytes20 for Flare contracts
// XRPL addresses are base58 encoded, decodeAccountID extracts the 20-byte account ID
function xrplAddressToBytes(xrplAddress: string): `0x${string}` {
  const accountId = decodeAccountID(xrplAddress);
  const hexAddress = Buffer.from(accountId).toString('hex');
  return `0x${hexAddress}` as `0x${string}`;
}

/**
 * Convert XRPL address to Flare/EVM address format
 * Uses the 20-byte account ID from the XRPL address as the Flare address
 */
export function xrplAddressToFlareAddress(xrplAddress: string): Address {
  return xrplAddressToBytes(xrplAddress) as Address;
}

// Generate a new Flare operator wallet
export function generateFlareWallet(): { address: string; privateKey: string } {
  const privateKey = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}` as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    privateKey,
  };
}
