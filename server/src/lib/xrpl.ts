import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import { createTransaction, updateTransaction } from './db';
import { decodeInstruction, getInstructionType } from './instruction';
import { processTransaction } from './executor';

const XRPL_NODE_URL = process.env.XRPL_NODE_URL || 'wss://s.altnet.rippletest.net:51233';

let client: Client | null = null;
let operatorWallet: Wallet | null = null;
let isListening = false;

export function getOperatorAddress(): string {
  if (!operatorWallet) {
    throw new Error('Operator wallet not initialized');
  }
  return operatorWallet.address;
}

export function getOperatorWallet(): Wallet {
  if (!operatorWallet) {
    throw new Error('Operator wallet not initialized');
  }
  return operatorWallet;
}

export async function initXrplClient(): Promise<{ address: string; secret: string }> {
  if (client?.isConnected()) {
    return { address: operatorWallet!.address, secret: operatorWallet!.seed! };
  }

  client = new Client(XRPL_NODE_URL);
  await client.connect();

  // Generate or load operator wallet
  const operatorSecret = process.env.XRPL_OPERATOR_SECRET;
  if (operatorSecret) {
    operatorWallet = Wallet.fromSeed(operatorSecret);
    console.log(`[XRPL] Using existing operator wallet: ${operatorWallet.address}`);
  } else {
    // Generate new wallet and fund it on testnet
    const fundResult = await client.fundWallet();
    operatorWallet = fundResult.wallet;
    console.log(`[XRPL] Generated new operator wallet: ${operatorWallet.address}`);
    console.log(`[XRPL] Operator secret: ${operatorWallet.seed}`);
    console.log(`[XRPL] Balance: ${fundResult.balance} XRP`);
  }

  return { address: operatorWallet.address, secret: operatorWallet.seed! };
}

export async function startXrplListener(): Promise<void> {
  if (isListening) return;
  if (!client?.isConnected()) {
    await initXrplClient();
  }

  const operatorAddress = getOperatorAddress();
  console.log(`[XRPL] Starting listener for account: ${operatorAddress}`);

  // Subscribe to account transactions
  await client!.request({
    command: 'subscribe',
    accounts: [operatorAddress],
  });

  client!.on('transaction', async (tx) => {
    try {
      await handleTransaction(tx);
    } catch (error) {
      console.error('[XRPL] Error handling transaction:', error);
    }
  });

  isListening = true;
  console.log('[XRPL] Listener started');
}

async function handleTransaction(tx: any): Promise<void> {
  console.log('[XRPL] Received event:', JSON.stringify(tx, null, 2));

  // Handle different event structures
  const txData = tx.transaction || tx.tx_json || tx;
  const meta = tx.meta || tx.metadata;

  // Skip if no transaction data
  if (!txData || !txData.TransactionType) {
    console.log('[XRPL] No valid transaction data, skipping');
    return;
  }

  // Only process validated transactions
  if (tx.validated === false) return;

  // Only process successful Payment transactions
  if (txData.TransactionType !== 'Payment') return;
  if (meta?.TransactionResult && meta.TransactionResult !== 'tesSUCCESS') return;

  // Only process incoming payments to our operator address
  const operatorAddress = getOperatorAddress();
  if (txData.Destination !== operatorAddress) return;

  // Get tx hash from various possible locations
  const txHash = tx.hash || txData.hash || tx.transaction?.hash;
  if (!txHash) {
    console.log('[XRPL] No transaction hash found, skipping');
    return;
  }

  // Get amount - can be Amount or DeliverMax depending on xrpl.js version
  // Also check delivered_amount from meta as fallback
  const amountField = txData.DeliverMax || txData.Amount || meta?.delivered_amount;

  // Get XRP amount (only handle native XRP for now)
  // Native XRP is always a string (drops), token amounts are objects
  if (typeof amountField !== 'string') {
    console.log(`[XRPL] Token payment not supported (got ${typeof amountField}), skipping`);
    return;
  }

  const xrpAmount = String(dropsToXrp(amountField));

  console.log(`[XRPL] Received payment from ${txData.Account}`);
  console.log(`[XRPL] TX Hash: ${txHash}`);
  console.log(`[XRPL] Amount: ${xrpAmount} XRP`);

  // Parse memo
  const memo = txData.Memos?.[0]?.Memo?.MemoData;
  if (!memo) {
    console.log('[XRPL] No memo found, skipping');
    return;
  }

  // Decode instruction from memo
  const instruction = decodeInstruction(memo);
  if (!instruction) {
    console.log('[XRPL] Invalid instruction in memo, skipping');
    return;
  }

  const instructionType = getInstructionType(instruction.instructionCode);
  if (!instructionType) {
    console.log(`[XRPL] Unknown instruction code: ${instruction.instructionCode}, skipping`);
    return;
  }

  // Create transaction record
  const transaction = await createTransaction({
    xrplTxHash: txHash,
    xrplAddress: txData.Account,
    xrpAmount,
    instructionType,
  });

  console.log(`[XRPL] Created transaction record: ${transaction.id}`);

  // Process transaction async (FDC proof + Flare execution + FXRP transfer)
  processTransaction(txHash, txData.Account, instruction, xrpAmount).catch((error) => {
    console.error(`[XRPL] Error processing transaction ${txHash}:`, error);
    updateTransaction(txHash, {
      status: 'failed',
      errorMessage: error.message,
    });
  });
}

export async function getAccountBalance(address: string): Promise<string> {
  if (!client?.isConnected()) {
    await initXrplClient();
  }

  try {
    const response = await client!.request({
      command: 'account_info',
      account: address,
    });
    return dropsToXrp(response.result.account_data.Balance);
  } catch (error: any) {
    if (error.data?.error === 'actNotFound') {
      return '0';
    }
    throw error;
  }
}

export async function disconnectXrpl(): Promise<void> {
  if (client?.isConnected()) {
    await client.disconnect();
    isListening = false;
    console.log('[XRPL] Disconnected');
  }
}
