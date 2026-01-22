import { updateTransaction, getTransaction } from './db';
import { getPaymentProof } from './fdc';
import { executeTransaction as executeOnFlare, getSmartAccount } from './flare';

interface DecodedInstruction {
  instructionCode: number;
  walletId: number;
  agentVaultAddress: string;
  vaultId: number;
  lots: number;
}

/**
 * Process a transaction: get FDC proof and execute on Flare
 */
export async function processTransaction(
  xrplTxHash: string,
  xrplAddress: string,
  instruction: DecodedInstruction
): Promise<void> {
  console.log(`[Executor] Processing transaction ${xrplTxHash}`);

  try {
    // Update status to proving
    await updateTransaction(xrplTxHash, { status: 'proving' });

    // Get FDC proof
    console.log(`[Executor] Getting FDC proof for ${xrplTxHash}`);
    const proof = await getPaymentProof(xrplTxHash);
    console.log(`[Executor] Proof obtained`);

    // Update status to executing
    await updateTransaction(xrplTxHash, { status: 'executing' });

    // Execute on Flare
    console.log(`[Executor] Executing on Flare for ${xrplAddress}`);
    const flareTxHash = await executeOnFlare(proof, xrplAddress);
    console.log(`[Executor] Flare TX: ${flareTxHash}`);

    // Get smart account address
    const smartAccount = await getSmartAccount(xrplAddress);
    console.log(`[Executor] Smart Account: ${smartAccount}`);

    // Update status to completed
    await updateTransaction(xrplTxHash, {
      status: 'completed',
      flareTxHash,
      flareSmartAccount: smartAccount,
    });

    console.log(`[Executor] Transaction ${xrplTxHash} completed`);
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
