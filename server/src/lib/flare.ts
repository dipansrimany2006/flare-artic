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
export const UPSHIFT_VAULT = '0xbAF89d873d198FF78E72D2745B01cBA3c6e5BE6B' as const;
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
  'function allowance(address owner, address spender) view returns (uint256)',
]);

// Firelight Vault ABI (ERC-4626 compliant)
const FIRELIGHT_VAULT_ABI = parseAbi([
  // View functions - Vault Info
  'function asset() view returns (address)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function cap() view returns (uint256)', // Vault cap
  'function currentPeriod() view returns (uint256)',
  'function currentPeriodStart() view returns (uint256)',
  'function currentPeriodEnd() view returns (uint256)',
  'function nextPeriodEnd() view returns (uint256)',
  // View functions - User Info
  'function balanceOf(address account) view returns (uint256)',
  'function maxDeposit(address account) view returns (uint256)',
  'function maxMint(address account) view returns (uint256)',
  'function maxWithdraw(address account) view returns (uint256)',
  'function maxRedeem(address account) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function convertToShares(uint256 assets) view returns (uint256)',
  'function previewDeposit(uint256 assets) view returns (uint256)',
  'function previewMint(uint256 shares) view returns (uint256)',
  'function previewWithdraw(uint256 assets) view returns (uint256)',
  'function previewRedeem(uint256 shares) view returns (uint256)',
  'function withdrawalsOf(uint256 period, address account) view returns (uint256)',
  // Write functions
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function mint(uint256 shares, address receiver) returns (uint256)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
  'function claimWithdraw(uint256 period) returns (uint256)',
  // Custom errors (OpenZeppelin ERC20/ERC4626)
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
  'error ERC4626ExceededMaxDeposit(address receiver, uint256 assets, uint256 max)',
  'error ERC4626ExceededMaxMint(address receiver, uint256 shares, uint256 max)',
  'error ERC4626ExceededMaxWithdraw(address owner, uint256 assets, uint256 max)',
  'error ERC4626ExceededMaxRedeem(address owner, uint256 shares, uint256 max)',
  // Common custom vault errors (0x6adf7e28 = DepositMoreThanMax)
  'error DepositMoreThanMax()',
  'error WithdrawMoreThanMax()',
  'error VaultPaused()',
  'error DepositNotAllowed()',
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

// ============================================
// FIRELIGHT VAULT FUNCTIONS
// ============================================

export interface FirelightVaultStatus {
  assetAddress: Address;
  totalAssets: string;
  totalSupply: string;
  currentPeriod: bigint;
  currentPeriodStart: bigint;
  currentPeriodEnd: bigint;
  nextPeriodEnd: bigint;
  exchangeRate: string;
}

export interface FirelightUserInfo {
  shares: string;
  assetsValue: string;
  maxDeposit: string;
  maxWithdraw: string;
  maxRedeem: string;
}

/**
 * Get Firelight vault status
 */
export async function getFirelightVaultStatus(): Promise<FirelightVaultStatus> {
  const client = getPublicClient();

  const [
    assetAddress,
    totalAssets,
    totalSupply,
    currentPeriod,
    currentPeriodStart,
    currentPeriodEnd,
    nextPeriodEnd,
  ] = await Promise.all([
    client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'asset',
    }),
    client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'totalAssets',
    }),
    client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'totalSupply',
    }),
    client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'currentPeriod',
    }),
    client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'currentPeriodStart',
    }),
    client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'currentPeriodEnd',
    }),
    client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'nextPeriodEnd',
    }),
  ]);

  // Calculate exchange rate (assets per share)
  const exchangeRate = totalSupply > 0n
    ? (Number(totalAssets) / Number(totalSupply)).toFixed(6)
    : '1.000000';

  return {
    assetAddress: assetAddress as Address,
    totalAssets: formatTokenBalance(totalAssets as bigint, 6), // FXRP has 6 decimals
    totalSupply: formatTokenBalance(totalSupply as bigint, 6),
    currentPeriod: currentPeriod as bigint,
    currentPeriodStart: currentPeriodStart as bigint,
    currentPeriodEnd: currentPeriodEnd as bigint,
    nextPeriodEnd: nextPeriodEnd as bigint,
    exchangeRate,
  };
}

/**
 * Get user's Firelight vault info
 */
export async function getFirelightUserInfo(userAddress: Address): Promise<FirelightUserInfo> {
  const client = getPublicClient();

  const [shares, maxDeposit, maxWithdraw, maxRedeem] = await Promise.all([
    client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    }),
    client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'maxDeposit',
      args: [userAddress],
    }),
    client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'maxWithdraw',
      args: [userAddress],
    }),
    client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'maxRedeem',
      args: [userAddress],
    }),
  ]);

  // Convert shares to assets value
  let assetsValue = 0n;
  if ((shares as bigint) > 0n) {
    assetsValue = await client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'convertToAssets',
      args: [shares as bigint],
    }) as bigint;
  }

  return {
    shares: formatTokenBalance(shares as bigint, 6),
    assetsValue: formatTokenBalance(assetsValue, 6),
    maxDeposit: formatTokenBalance(maxDeposit as bigint, 6),
    maxWithdraw: formatTokenBalance(maxWithdraw as bigint, 6),
    maxRedeem: formatTokenBalance(maxRedeem as bigint, 6),
  };
}

/**
 * Preview how many shares will be received for a deposit amount
 */
export async function previewFirelightDeposit(amountXRP: string): Promise<string> {
  const client = getPublicClient();
  const amount = BigInt(Math.floor(parseFloat(amountXRP) * 10 ** 6));

  const shares = await client.readContract({
    address: FIRELIGHT_VAULT,
    abi: FIRELIGHT_VAULT_ABI,
    functionName: 'previewDeposit',
    args: [amount],
  }) as bigint;

  return formatTokenBalance(shares, 6);
}

/**
 * Deposit FXRP into Firelight vault
 * @param amountXRP - Amount to deposit (in XRP/FXRP units)
 * @param receiverAddress - Address to receive the vault shares (stXRP)
 * @returns Transaction hash and shares received
 */
export async function depositToFirelight(
  amountXRP: string,
  receiverAddress: Address
): Promise<{ txHash: Hash; sharesReceived: string }> {
  const wallet = getWalletClient();
  const account = getOperatorAccount();
  const client = getPublicClient();

  // Get asset token address from vault
  const assetAddress = await client.readContract({
    address: FIRELIGHT_VAULT,
    abi: FIRELIGHT_VAULT_ABI,
    functionName: 'asset',
  }) as Address;

  // Get decimals (FXRP uses 6 decimals)
  const decimals = await client.readContract({
    address: assetAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
  }) as number;

  const amount = BigInt(Math.floor(parseFloat(amountXRP) * 10 ** decimals));

  // Get asset token symbol for verification
  const assetSymbol = await client.readContract({
    address: assetAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
  }) as string;

  // Get vault state info including cap
  let vaultCap: bigint = BigInt(0);
  try {
    vaultCap = await client.readContract({
      address: FIRELIGHT_VAULT,
      abi: FIRELIGHT_VAULT_ABI,
      functionName: 'cap'
    }) as bigint;
  } catch {
    console.log(`[Firelight] No cap() function found, vault may not have a cap`);
  }

  const [currentPeriod, currentPeriodStart, currentPeriodEnd, totalAssets, totalSupply] = await Promise.all([
    client.readContract({ address: FIRELIGHT_VAULT, abi: FIRELIGHT_VAULT_ABI, functionName: 'currentPeriod' }),
    client.readContract({ address: FIRELIGHT_VAULT, abi: FIRELIGHT_VAULT_ABI, functionName: 'currentPeriodStart' }),
    client.readContract({ address: FIRELIGHT_VAULT, abi: FIRELIGHT_VAULT_ABI, functionName: 'currentPeriodEnd' }),
    client.readContract({ address: FIRELIGHT_VAULT, abi: FIRELIGHT_VAULT_ABI, functionName: 'totalAssets' }),
    client.readContract({ address: FIRELIGHT_VAULT, abi: FIRELIGHT_VAULT_ABI, functionName: 'totalSupply' }),
  ]);

  const now = Math.floor(Date.now() / 1000);
  console.log(`[Firelight] === VAULT STATE ===`);
  console.log(`[Firelight] Vault cap: ${vaultCap > 0n ? formatTokenBalance(vaultCap, decimals) + ' ' + assetSymbol : 'No cap or cap not found'}`);
  console.log(`[Firelight] Total assets: ${formatTokenBalance(totalAssets as bigint, decimals)} ${assetSymbol}`);
  console.log(`[Firelight] Total supply: ${formatTokenBalance(totalSupply as bigint, decimals)} stXRP`);
  console.log(`[Firelight] Available capacity: ${vaultCap > 0n ? formatTokenBalance(vaultCap - (totalAssets as bigint), decimals) + ' ' + assetSymbol : 'Unknown'}`);
  console.log(`[Firelight] Current period: ${currentPeriod}`);
  console.log(`[Firelight] Period start: ${currentPeriodStart} (${new Date(Number(currentPeriodStart) * 1000).toISOString()})`);
  console.log(`[Firelight] Period end: ${currentPeriodEnd} (${new Date(Number(currentPeriodEnd) * 1000).toISOString()})`);
  console.log(`[Firelight] Current time: ${now} (${new Date(now * 1000).toISOString()})`);
  console.log(`[Firelight] === END VAULT STATE ===`);

  // Check if vault has capacity
  if (vaultCap > 0n) {
    const availableCapacity = vaultCap - (totalAssets as bigint);
    if (amount > availableCapacity) {
      throw new Error(`Firelight vault has reached its deposit cap. Cap: ${formatTokenBalance(vaultCap, decimals)} ${assetSymbol}, Current: ${formatTokenBalance(totalAssets as bigint, decimals)} ${assetSymbol}, Available: ${formatTokenBalance(availableCapacity, decimals)} ${assetSymbol}, Requested: ${amountXRP} ${assetSymbol}`);
    }
  }

  console.log(`[Firelight] Asset token: ${assetSymbol} at ${assetAddress}`);
  console.log(`[Firelight] Token decimals: ${decimals}`);
  console.log(`[Firelight] Depositing ${amountXRP} ${assetSymbol} (${amount} raw) to vault`);
  console.log(`[Firelight] Operator (sender): ${account.address}`);
  console.log(`[Firelight] Receiver: ${receiverAddress}`);

  // Check platform's FXRP balance
  const platformBalance = await client.readContract({
    address: assetAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;

  console.log(`[Firelight] Platform balance: ${formatTokenBalance(platformBalance, decimals)} FXRP (${platformBalance} raw)`);

  if (platformBalance < amount) {
    const balanceStr = formatTokenBalance(platformBalance, decimals);
    throw new Error(`Insufficient FXRP balance. Platform has ${balanceStr} FXRP, need ${amountXRP} FXRP`);
  }

  // Check max deposit allowed for receiver
  const maxDepositReceiver = await client.readContract({
    address: FIRELIGHT_VAULT,
    abi: FIRELIGHT_VAULT_ABI,
    functionName: 'maxDeposit',
    args: [receiverAddress],
  }) as bigint;

  // Also check max deposit for operator (in case vault restricts by sender)
  const maxDepositOperator = await client.readContract({
    address: FIRELIGHT_VAULT,
    abi: FIRELIGHT_VAULT_ABI,
    functionName: 'maxDeposit',
    args: [account.address],
  }) as bigint;

  console.log(`[Firelight] Max deposit for receiver (${receiverAddress}): ${formatTokenBalance(maxDepositReceiver, decimals)} FXRP (${maxDepositReceiver} raw)`);
  console.log(`[Firelight] Max deposit for operator (${account.address}): ${formatTokenBalance(maxDepositOperator, decimals)} FXRP (${maxDepositOperator} raw)`);

  // Check if vault is accepting deposits
  if (maxDepositReceiver === 0n && maxDepositOperator === 0n) {
    throw new Error('Firelight vault is not accepting deposits. Both receiver and operator have maxDeposit of 0. The vault may be paused or have deposit restrictions.');
  }

  // Many ERC-4626 vaults require sender == receiver for deposits
  // Always deposit to operator first, then transfer shares to the receiver
  // This is more reliable than trying receiver first and potentially failing
  const actualReceiver = account.address;
  const maxDeposit = maxDepositOperator;
  const needsShareTransfer = receiverAddress.toLowerCase() !== account.address.toLowerCase();

  console.log(`[Firelight] Using operator as deposit receiver (vault may require sender==receiver)`);
  console.log(`[Firelight] Will transfer shares to ${receiverAddress} after deposit: ${needsShareTransfer}`);

  if (amount > maxDeposit) {
    throw new Error(`Deposit amount (${amountXRP} FXRP) exceeds max allowed: ${formatTokenBalance(maxDeposit, decimals)} FXRP`);
  }

  // Check current allowance
  let currentAllowance = await client.readContract({
    address: assetAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, FIRELIGHT_VAULT],
  }) as bigint;

  console.log(`[Firelight] Current allowance: ${formatTokenBalance(currentAllowance, decimals)} FXRP (${currentAllowance} raw)`);

  // Approve vault to spend FXRP if needed - use max uint256 for unlimited approval
  const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  if (currentAllowance < amount) {
    console.log(`[Firelight] Approving vault for max amount...`);
    const { request: approveRequest } = await client.simulateContract({
      address: assetAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [FIRELIGHT_VAULT, maxApproval],
      account,
    });
    const approveHash = await wallet.writeContract(approveRequest);
    await client.waitForTransactionReceipt({ hash: approveHash });
    console.log(`[Firelight] Approval confirmed: ${approveHash}`);

    // Verify approval went through
    currentAllowance = await client.readContract({
      address: assetAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, FIRELIGHT_VAULT],
    }) as bigint;
    console.log(`[Firelight] Verified allowance: ${formatTokenBalance(currentAllowance, decimals)} FXRP (${currentAllowance} raw)`);
  }

  // Preview shares to receive
  const expectedShares = await client.readContract({
    address: FIRELIGHT_VAULT,
    abi: FIRELIGHT_VAULT_ABI,
    functionName: 'previewDeposit',
    args: [amount],
  }) as bigint;

  console.log(`[Firelight] Expected shares: ${formatTokenBalance(expectedShares, decimals)} stXRP`);
  console.log(`[Firelight] Executing deposit(${amount}, ${actualReceiver})...`);

  // Execute deposit
  const { request: depositRequest } = await client.simulateContract({
    address: FIRELIGHT_VAULT,
    abi: FIRELIGHT_VAULT_ABI,
    functionName: 'deposit',
    args: [amount, actualReceiver],
    account,
  });

  const txHash = await wallet.writeContract(depositRequest);
  console.log(`[Firelight] Deposit submitted: ${txHash}`);

  // Wait for confirmation
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  console.log(`[Firelight] Deposit confirmed in block ${receipt.blockNumber}`);

  // Transfer shares to the intended receiver if different from operator
  if (needsShareTransfer) {
    console.log(`[Firelight] Transferring ${formatTokenBalance(expectedShares, decimals)} stXRP to receiver ${receiverAddress}`);
    const { request: transferRequest } = await client.simulateContract({
      address: FIRELIGHT_VAULT,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [receiverAddress, expectedShares],
      account,
    });
    const transferHash = await wallet.writeContract(transferRequest);
    await client.waitForTransactionReceipt({ hash: transferHash });
    console.log(`[Firelight] Share transfer confirmed: ${transferHash}`);
  }

  return {
    txHash,
    sharesReceived: formatTokenBalance(expectedShares, decimals),
  };
}

/**
 * Request withdrawal from Firelight vault (period-based)
 * @param sharesAmount - Number of shares to redeem
 * @param receiverAddress - Address to receive the assets
 * @param ownerAddress - Address that owns the shares
 * @returns Transaction hash
 */
export async function redeemFromFirelight(
  sharesAmount: string,
  receiverAddress: Address,
  ownerAddress: Address
): Promise<Hash> {
  const wallet = getWalletClient();
  const account = getOperatorAccount();
  const client = getPublicClient();

  const shares = BigInt(Math.floor(parseFloat(sharesAmount) * 10 ** 6));

  console.log(`[Firelight] Redeeming ${sharesAmount} shares for ${receiverAddress}`);

  // Check max redeem
  const maxRedeem = await client.readContract({
    address: FIRELIGHT_VAULT,
    abi: FIRELIGHT_VAULT_ABI,
    functionName: 'maxRedeem',
    args: [ownerAddress],
  }) as bigint;

  if (shares > maxRedeem) {
    throw new Error(`Redeem amount exceeds max allowed: ${formatTokenBalance(maxRedeem, 6)} shares`);
  }

  // Execute redeem
  const { request } = await client.simulateContract({
    address: FIRELIGHT_VAULT,
    abi: FIRELIGHT_VAULT_ABI,
    functionName: 'redeem',
    args: [shares, receiverAddress, ownerAddress],
    account,
  });

  const txHash = await wallet.writeContract(request);
  console.log(`[Firelight] Redeem submitted: ${txHash}`);

  // Wait for confirmation
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  console.log(`[Firelight] Redeem confirmed in block ${receipt.blockNumber}`);

  return txHash;
}

/**
 * Claim completed withdrawal from Firelight vault
 * @param period - The period number to claim
 * @returns Transaction hash and amount claimed
 */
export async function claimFirelightWithdrawal(period: bigint): Promise<{ txHash: Hash; amountClaimed: string }> {
  const wallet = getWalletClient();
  const account = getOperatorAccount();
  const client = getPublicClient();

  console.log(`[Firelight] Claiming withdrawal for period ${period}`);

  // Execute claim
  const { request } = await client.simulateContract({
    address: FIRELIGHT_VAULT,
    abi: FIRELIGHT_VAULT_ABI,
    functionName: 'claimWithdraw',
    args: [period],
    account,
  });

  const txHash = await wallet.writeContract(request);
  console.log(`[Firelight] Claim submitted: ${txHash}`);

  // Wait for confirmation
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  console.log(`[Firelight] Claim confirmed in block ${receipt.blockNumber}`);

  // Note: actual amount claimed would be parsed from logs in production
  return {
    txHash,
    amountClaimed: '0', // Would parse from receipt logs
  };
}

/**
 * Get pending withdrawals for a user at a specific period
 */
export async function getFirelightPendingWithdrawals(
  period: bigint,
  userAddress: Address
): Promise<string> {
  const client = getPublicClient();

  const pendingAmount = await client.readContract({
    address: FIRELIGHT_VAULT,
    abi: FIRELIGHT_VAULT_ABI,
    functionName: 'withdrawalsOf',
    args: [period, userAddress],
  }) as bigint;

  return formatTokenBalance(pendingAmount, 6);
}

// ============================================
// UPSHIFT VAULT FUNCTIONS
// ============================================

// Upshift Vault ABI (ERC-4626 compliant)
const UPSHIFT_VAULT_ABI = parseAbi([
  // View functions - Vault Info
  'function asset() view returns (address)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  // View functions - User Info
  'function balanceOf(address account) view returns (uint256)',
  'function maxDeposit(address account) view returns (uint256)',
  'function maxMint(address account) view returns (uint256)',
  'function maxWithdraw(address account) view returns (uint256)',
  'function maxRedeem(address account) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function convertToShares(uint256 assets) view returns (uint256)',
  'function previewDeposit(uint256 assets) view returns (uint256)',
  'function previewMint(uint256 shares) view returns (uint256)',
  'function previewWithdraw(uint256 assets) view returns (uint256)',
  'function previewRedeem(uint256 shares) view returns (uint256)',
  // Write functions
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function mint(uint256 shares, address receiver) returns (uint256)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
  // Custom errors (OpenZeppelin ERC20/ERC4626)
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
  'error ERC4626ExceededMaxDeposit(address receiver, uint256 assets, uint256 max)',
  'error ERC4626ExceededMaxMint(address receiver, uint256 shares, uint256 max)',
  'error ERC4626ExceededMaxWithdraw(address owner, uint256 assets, uint256 max)',
  'error ERC4626ExceededMaxRedeem(address owner, uint256 shares, uint256 max)',
]);

export interface UpshiftVaultStatus {
  assetAddress: Address;
  totalAssets: string;
  totalSupply: string;
  exchangeRate: string;
}

export interface UpshiftUserInfo {
  shares: string;
  assetsValue: string;
  maxDeposit: string;
  maxWithdraw: string;
  maxRedeem: string;
}

/**
 * Get Upshift vault status
 */
export async function getUpshiftVaultStatus(): Promise<UpshiftVaultStatus> {
  const client = getPublicClient();

  const [assetAddress, totalAssets, totalSupply] = await Promise.all([
    client.readContract({
      address: UPSHIFT_VAULT,
      abi: UPSHIFT_VAULT_ABI,
      functionName: 'asset',
    }),
    client.readContract({
      address: UPSHIFT_VAULT,
      abi: UPSHIFT_VAULT_ABI,
      functionName: 'totalAssets',
    }),
    client.readContract({
      address: UPSHIFT_VAULT,
      abi: UPSHIFT_VAULT_ABI,
      functionName: 'totalSupply',
    }),
  ]);

  // Calculate exchange rate (assets per share)
  const exchangeRate = totalSupply > 0n
    ? (Number(totalAssets) / Number(totalSupply)).toFixed(6)
    : '1.000000';

  return {
    assetAddress: assetAddress as Address,
    totalAssets: formatTokenBalance(totalAssets as bigint, 6),
    totalSupply: formatTokenBalance(totalSupply as bigint, 6),
    exchangeRate,
  };
}

/**
 * Get user's Upshift vault info
 */
export async function getUpshiftUserInfo(userAddress: Address): Promise<UpshiftUserInfo> {
  const client = getPublicClient();

  const [shares, maxDeposit, maxWithdraw, maxRedeem] = await Promise.all([
    client.readContract({
      address: UPSHIFT_VAULT,
      abi: UPSHIFT_VAULT_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    }),
    client.readContract({
      address: UPSHIFT_VAULT,
      abi: UPSHIFT_VAULT_ABI,
      functionName: 'maxDeposit',
      args: [userAddress],
    }),
    client.readContract({
      address: UPSHIFT_VAULT,
      abi: UPSHIFT_VAULT_ABI,
      functionName: 'maxWithdraw',
      args: [userAddress],
    }),
    client.readContract({
      address: UPSHIFT_VAULT,
      abi: UPSHIFT_VAULT_ABI,
      functionName: 'maxRedeem',
      args: [userAddress],
    }),
  ]);

  // Convert shares to assets value
  let assetsValue = 0n;
  if ((shares as bigint) > 0n) {
    assetsValue = await client.readContract({
      address: UPSHIFT_VAULT,
      abi: UPSHIFT_VAULT_ABI,
      functionName: 'convertToAssets',
      args: [shares as bigint],
    }) as bigint;
  }

  return {
    shares: formatTokenBalance(shares as bigint, 6),
    assetsValue: formatTokenBalance(assetsValue, 6),
    maxDeposit: formatTokenBalance(maxDeposit as bigint, 6),
    maxWithdraw: formatTokenBalance(maxWithdraw as bigint, 6),
    maxRedeem: formatTokenBalance(maxRedeem as bigint, 6),
  };
}

/**
 * Preview how many shares will be received for a deposit amount
 */
export async function previewUpshiftDeposit(amountXRP: string): Promise<string> {
  const client = getPublicClient();
  const amount = BigInt(Math.floor(parseFloat(amountXRP) * 10 ** 6));

  const shares = await client.readContract({
    address: UPSHIFT_VAULT,
    abi: UPSHIFT_VAULT_ABI,
    functionName: 'previewDeposit',
    args: [amount],
  }) as bigint;

  return formatTokenBalance(shares, 6);
}

/**
 * Deposit FXRP into Upshift vault
 * @param amountXRP - Amount to deposit (in XRP/FXRP units)
 * @param receiverAddress - Address to receive the vault shares (earnXRP)
 * @returns Transaction hash and shares received
 */
export async function depositToUpshift(
  amountXRP: string,
  receiverAddress: Address
): Promise<{ txHash: Hash; sharesReceived: string }> {
  const wallet = getWalletClient();
  const account = getOperatorAccount();
  const client = getPublicClient();

  // Get asset token address from vault
  const assetAddress = await client.readContract({
    address: UPSHIFT_VAULT,
    abi: UPSHIFT_VAULT_ABI,
    functionName: 'asset',
  }) as Address;

  // Get decimals (FXRP uses 6 decimals)
  const decimals = await client.readContract({
    address: assetAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
  }) as number;

  const amount = BigInt(Math.floor(parseFloat(amountXRP) * 10 ** decimals));

  // Get asset token symbol for verification
  const assetSymbol = await client.readContract({
    address: assetAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
  }) as string;

  console.log(`[Upshift] Asset token: ${assetSymbol} at ${assetAddress}`);
  console.log(`[Upshift] Token decimals: ${decimals}`);
  console.log(`[Upshift] Depositing ${amountXRP} ${assetSymbol} (${amount} raw) to vault`);
  console.log(`[Upshift] Operator (sender): ${account.address}`);
  console.log(`[Upshift] Receiver: ${receiverAddress}`);

  // Check platform's FXRP balance
  const platformBalance = await client.readContract({
    address: assetAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  }) as bigint;

  console.log(`[Upshift] Platform balance: ${formatTokenBalance(platformBalance, decimals)} FXRP (${platformBalance} raw)`);

  if (platformBalance < amount) {
    const balanceStr = formatTokenBalance(platformBalance, decimals);
    throw new Error(`Insufficient FXRP balance. Platform has ${balanceStr} FXRP, need ${amountXRP} FXRP`);
  }

  // Check max deposit allowed for receiver
  const maxDepositReceiver = await client.readContract({
    address: UPSHIFT_VAULT,
    abi: UPSHIFT_VAULT_ABI,
    functionName: 'maxDeposit',
    args: [receiverAddress],
  }) as bigint;

  // Also check max deposit for operator (in case vault restricts by sender)
  const maxDepositOperator = await client.readContract({
    address: UPSHIFT_VAULT,
    abi: UPSHIFT_VAULT_ABI,
    functionName: 'maxDeposit',
    args: [account.address],
  }) as bigint;

  console.log(`[Upshift] Max deposit for receiver (${receiverAddress}): ${formatTokenBalance(maxDepositReceiver, decimals)} FXRP (${maxDepositReceiver} raw)`);
  console.log(`[Upshift] Max deposit for operator (${account.address}): ${formatTokenBalance(maxDepositOperator, decimals)} FXRP (${maxDepositOperator} raw)`);

  // Check if vault is accepting deposits
  if (maxDepositReceiver === 0n && maxDepositOperator === 0n) {
    throw new Error('Upshift vault is not accepting deposits. Both receiver and operator have maxDeposit of 0. The vault may be paused or have deposit restrictions.');
  }

  // Many ERC-4626 vaults require sender == receiver for deposits
  // Always deposit to operator first, then transfer shares to the receiver
  // This is more reliable than trying receiver first and potentially failing
  const actualReceiver = account.address;
  const maxDeposit = maxDepositOperator;
  const needsShareTransfer = receiverAddress.toLowerCase() !== account.address.toLowerCase();

  console.log(`[Upshift] Using operator as deposit receiver (vault may require sender==receiver)`);
  console.log(`[Upshift] Will transfer shares to ${receiverAddress} after deposit: ${needsShareTransfer}`);

  if (amount > maxDeposit) {
    throw new Error(`Deposit amount (${amountXRP} FXRP) exceeds max allowed: ${formatTokenBalance(maxDeposit, decimals)} FXRP`);
  }

  // Check current allowance
  let currentAllowance = await client.readContract({
    address: assetAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, UPSHIFT_VAULT],
  }) as bigint;

  console.log(`[Upshift] Current allowance: ${formatTokenBalance(currentAllowance, decimals)} ${assetSymbol} (${currentAllowance} raw)`);

  // Approve vault to spend tokens if needed - use max uint256 for unlimited approval
  const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  if (currentAllowance < amount) {
    console.log(`[Upshift] Approving vault for max amount...`);
    const { request: approveRequest } = await client.simulateContract({
      address: assetAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [UPSHIFT_VAULT, maxApproval],
      account,
    });
    const approveHash = await wallet.writeContract(approveRequest);
    await client.waitForTransactionReceipt({ hash: approveHash });
    console.log(`[Upshift] Approval confirmed: ${approveHash}`);

    // Verify approval went through
    currentAllowance = await client.readContract({
      address: assetAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, UPSHIFT_VAULT],
    }) as bigint;
    console.log(`[Upshift] Verified allowance: ${formatTokenBalance(currentAllowance, decimals)} ${assetSymbol} (${currentAllowance} raw)`);
  }

  // Preview shares to receive
  const expectedShares = await client.readContract({
    address: UPSHIFT_VAULT,
    abi: UPSHIFT_VAULT_ABI,
    functionName: 'previewDeposit',
    args: [amount],
  }) as bigint;

  console.log(`[Upshift] Expected shares: ${formatTokenBalance(expectedShares, decimals)} earnXRP`);
  console.log(`[Upshift] Executing deposit(${amount}, ${actualReceiver})...`);

  // Execute deposit
  const { request: depositRequest } = await client.simulateContract({
    address: UPSHIFT_VAULT,
    abi: UPSHIFT_VAULT_ABI,
    functionName: 'deposit',
    args: [amount, actualReceiver],
    account,
  });

  const txHash = await wallet.writeContract(depositRequest);
  console.log(`[Upshift] Deposit submitted: ${txHash}`);

  // Wait for confirmation
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  console.log(`[Upshift] Deposit confirmed in block ${receipt.blockNumber}`);

  // Transfer shares to the intended receiver if different from operator
  if (needsShareTransfer) {
    console.log(`[Upshift] Transferring ${formatTokenBalance(expectedShares, decimals)} earnXRP to receiver ${receiverAddress}`);
    const { request: transferRequest } = await client.simulateContract({
      address: UPSHIFT_VAULT,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [receiverAddress, expectedShares],
      account,
    });
    const transferHash = await wallet.writeContract(transferRequest);
    await client.waitForTransactionReceipt({ hash: transferHash });
    console.log(`[Upshift] Share transfer confirmed: ${transferHash}`);
  }

  return {
    txHash,
    sharesReceived: formatTokenBalance(expectedShares, decimals),
  };
}

/**
 * Request withdrawal from Upshift vault
 * @param sharesAmount - Number of shares to redeem
 * @param receiverAddress - Address to receive the assets
 * @param ownerAddress - Address that owns the shares
 * @returns Transaction hash
 */
export async function redeemFromUpshift(
  sharesAmount: string,
  receiverAddress: Address,
  ownerAddress: Address
): Promise<Hash> {
  const wallet = getWalletClient();
  const account = getOperatorAccount();
  const client = getPublicClient();

  const shares = BigInt(Math.floor(parseFloat(sharesAmount) * 10 ** 6));

  console.log(`[Upshift] Redeeming ${sharesAmount} shares for ${receiverAddress}`);

  // Check max redeem
  const maxRedeem = await client.readContract({
    address: UPSHIFT_VAULT,
    abi: UPSHIFT_VAULT_ABI,
    functionName: 'maxRedeem',
    args: [ownerAddress],
  }) as bigint;

  if (shares > maxRedeem) {
    throw new Error(`Redeem amount exceeds max allowed: ${formatTokenBalance(maxRedeem, 6)} shares`);
  }

  // Execute redeem
  const { request } = await client.simulateContract({
    address: UPSHIFT_VAULT,
    abi: UPSHIFT_VAULT_ABI,
    functionName: 'redeem',
    args: [shares, receiverAddress, ownerAddress],
    account,
  });

  const txHash = await wallet.writeContract(request);
  console.log(`[Upshift] Redeem submitted: ${txHash}`);

  // Wait for confirmation
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  console.log(`[Upshift] Redeem confirmed in block ${receipt.blockNumber}`);

  return txHash;
}
