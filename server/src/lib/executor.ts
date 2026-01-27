import { updateTransaction, getTransaction } from './db';
import { transferFXRP, xrplAddressToFlareAddress } from './flare';
import type { Address } from 'viem';

interface DecodedInstruction {
  instructionCode: number;
  walletId: number;
  agentVaultAddress: string;
  vaultId: number;
  lots: number;
}

/**
 * Process a transaction: transfer FXRP to user's linked Flare address
 */
export async function processTransaction(
  xrplTxHash: string,
  xrplAddress: string,
  instruction: DecodedInstruction,
  xrpAmount: string
): Promise<void> {
  console.log(`[Executor] Processing transaction ${xrplTxHash}`);

  try {
    // Update status to executing
    await updateTransaction(xrplTxHash, { status: 'executing' });

    // Derive Flare address from XRPL address (deterministic mapping)
    const recipientAddress = xrplAddressToFlareAddress(xrplAddress);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Executor] XRPL Address: ${xrplAddress}`);
    console.log(`[Executor] Flare Recipient: ${recipientAddress}`);
    console.log(`[Executor] Explorer: https://coston2-explorer.flare.network/address/${recipientAddress}`);
    console.log(`${'='.repeat(60)}\n`);

    // Transfer FXRP to user's address (1:1 ratio with deposited XRP)
    console.log(`[Executor] Transferring ${xrpAmount} FXRP to ${recipientAddress}`);
    const fxrpTransferTxHash = await transferFXRP(recipientAddress as Address, xrpAmount);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Executor] FXRP TRANSFER COMPLETED`);
    console.log(`[Executor] Amount: ${xrpAmount} FXRP`);
    console.log(`[Executor] To: ${recipientAddress}`);
    console.log(`[Executor] TX Hash: ${fxrpTransferTxHash}`);
    console.log(`[Executor] Explorer: https://coston2-explorer.flare.network/tx/${fxrpTransferTxHash}`);
    console.log(`${'='.repeat(60)}\n`);

    // Update status to completed
    await updateTransaction(xrplTxHash, {
      status: 'completed',
      flareTxHash: fxrpTransferTxHash,
      flareSmartAccount: recipientAddress,
    });

    console.log(`[Executor] Transaction ${xrplTxHash} completed - ${xrpAmount} FXRP transferred`);
  } catch (error: any) {
    console.error(`[Executor] Error processing ${xrplTxHash}:`, error);
    await updateTransaction(xrplTxHash, {
      status: 'failed',
      errorMessage: error.message,
    });
    throw error;
  }
}

/**
 * Retry a failed transaction
 */
export async function retryTransaction(xrplTxHash: string): Promise<void> {
  const tx = await getTransaction(xrplTxHash);
  if (!tx) {
    throw new Error(`Transaction ${xrplTxHash} not found`);
  }

  if (tx.status !== 'failed') {
    throw new Error(`Transaction ${xrplTxHash} is not in failed state`);
  }

  // Reset status and retry
  await updateTransaction(xrplTxHash, {
    status: 'pending',
    errorMessage: null,
  });

  // We need the original instruction - for now just re-process
  // In production, store the instruction in the DB
  console.log(`[Executor] Retrying transaction ${xrplTxHash}`);
}

/**
 * Get transaction processing queue status
 */
export function getQueueStatus(): {
  pending: number;
  proving: number;
  executing: number;
} {
  // In-memory tracking for simple implementation
  // In production, query the database
  return {
    pending: 0,
    proving: 0,
    executing: 0,
  };
}
