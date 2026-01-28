import { updateTransaction, getTransaction } from './db';
import { transferFXRP, xrplAddressToFlareAddress, depositToFirelight, depositToUpshift } from './flare';
import { INSTRUCTION_CODES, decodeSplitInstruction } from './instruction';
import type { Address } from 'viem';

interface DecodedInstruction {
  instructionCode: number;
  walletId: number;
  agentVaultAddress: string;
  vaultId: number;
  lots: number;
  // For split instructions
  firelightPercent?: number;
  upshiftPercent?: number;
}

/**
 * Process a transaction: deposit FXRP into yield strategy based on instruction
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
    console.log(`[Executor] Instruction Code: 0x${instruction.instructionCode.toString(16)}`);
    console.log(`[Executor] Explorer: https://coston2-explorer.flare.network/address/${recipientAddress}`);
    console.log(`${'='.repeat(60)}\n`);

    let flareTxHash: string;
    let strategyName: string;

    // Route to appropriate strategy based on instruction code
    if (instruction.instructionCode === INSTRUCTION_CODES.firelight) {
      // Firelight Strategy: Deposit FXRP into Firelight vault
      strategyName = 'Firelight';
      console.log(`[Executor] Depositing ${xrpAmount} FXRP into Firelight vault for ${recipientAddress}`);

      const { txHash, sharesReceived } = await depositToFirelight(xrpAmount, recipientAddress as Address);
      flareTxHash = txHash;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`[Executor] FIRELIGHT DEPOSIT COMPLETED`);
      console.log(`[Executor] Amount Deposited: ${xrpAmount} FXRP`);
      console.log(`[Executor] Shares Received: ${sharesReceived} stXRP`);
      console.log(`[Executor] Receiver: ${recipientAddress}`);
      console.log(`[Executor] TX Hash: ${flareTxHash}`);
      console.log(`[Executor] Explorer: https://coston2-explorer.flare.network/tx/${flareTxHash}`);
      console.log(`${'='.repeat(60)}\n`);
    } else if (instruction.instructionCode === INSTRUCTION_CODES.upshift) {
      // Upshift Strategy: Deposit FXRP into Upshift vault
      strategyName = 'Upshift';
      console.log(`[Executor] Depositing ${xrpAmount} FXRP into Upshift vault for ${recipientAddress}`);

      const { txHash, sharesReceived } = await depositToUpshift(xrpAmount, recipientAddress as Address);
      flareTxHash = txHash;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`[Executor] UPSHIFT DEPOSIT COMPLETED`);
      console.log(`[Executor] Amount Deposited: ${xrpAmount} FXRP`);
      console.log(`[Executor] Shares Received: ${sharesReceived} earnXRP`);
      console.log(`[Executor] Receiver: ${recipientAddress}`);
      console.log(`[Executor] TX Hash: ${flareTxHash}`);
      console.log(`[Executor] Explorer: https://coston2-explorer.flare.network/tx/${flareTxHash}`);
      console.log(`${'='.repeat(60)}\n`);
    } else if (instruction.instructionCode === INSTRUCTION_CODES.split) {
      // Split Strategy: Deposit to both Firelight and Upshift based on allocation
      const firelightPercent = instruction.firelightPercent ?? 50;
      const upshiftPercent = instruction.upshiftPercent ?? 50;

      strategyName = `Split (${firelightPercent}% Firelight / ${upshiftPercent}% Upshift)`;
      console.log(`[Executor] Split deposit: ${firelightPercent}% Firelight, ${upshiftPercent}% Upshift`);

      const totalAmount = parseFloat(xrpAmount);
      const firelightAmount = (totalAmount * firelightPercent / 100).toFixed(6);
      const upshiftAmount = (totalAmount * upshiftPercent / 100).toFixed(6);

      console.log(`[Executor] Firelight amount: ${firelightAmount} FXRP`);
      console.log(`[Executor] Upshift amount: ${upshiftAmount} FXRP`);

      let firelightTxHash = '';
      let upshiftTxHash = '';
      let firelightShares = '0';
      let upshiftShares = '0';

      // Deposit to Firelight if allocation > 0
      if (firelightPercent > 0) {
        console.log(`[Executor] Depositing ${firelightAmount} FXRP into Firelight vault...`);
        const firelightResult = await depositToFirelight(firelightAmount, recipientAddress as Address);
        firelightTxHash = firelightResult.txHash;
        firelightShares = firelightResult.sharesReceived;
        console.log(`[Executor] Firelight deposit completed: ${firelightShares} stXRP`);
      }

      // Deposit to Upshift if allocation > 0
      if (upshiftPercent > 0) {
        console.log(`[Executor] Depositing ${upshiftAmount} FXRP into Upshift vault...`);
        const upshiftResult = await depositToUpshift(upshiftAmount, recipientAddress as Address);
        upshiftTxHash = upshiftResult.txHash;
        upshiftShares = upshiftResult.sharesReceived;
        console.log(`[Executor] Upshift deposit completed: ${upshiftShares} earnXRP`);
      }

      // Use the last transaction hash (or combine them)
      flareTxHash = upshiftTxHash || firelightTxHash;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`[Executor] SPLIT DEPOSIT COMPLETED`);
      console.log(`[Executor] Total Amount: ${xrpAmount} FXRP`);
      console.log(`[Executor] Firelight: ${firelightAmount} FXRP → ${firelightShares} stXRP`);
      console.log(`[Executor] Upshift: ${upshiftAmount} FXRP → ${upshiftShares} earnXRP`);
      console.log(`[Executor] Receiver: ${recipientAddress}`);
      if (firelightTxHash) console.log(`[Executor] Firelight TX: https://coston2-explorer.flare.network/tx/${firelightTxHash}`);
      if (upshiftTxHash) console.log(`[Executor] Upshift TX: https://coston2-explorer.flare.network/tx/${upshiftTxHash}`);
      console.log(`${'='.repeat(60)}\n`);
    } else {
      // Fallback: Direct FXRP transfer for unknown strategies
      strategyName = 'Direct Transfer';
      console.log(`[Executor] Unknown instruction code 0x${instruction.instructionCode.toString(16)}, falling back to direct transfer`);
      console.log(`[Executor] Transferring ${xrpAmount} FXRP to ${recipientAddress}`);

      flareTxHash = await transferFXRP(recipientAddress as Address, xrpAmount);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`[Executor] FXRP TRANSFER COMPLETED`);
      console.log(`[Executor] Amount: ${xrpAmount} FXRP`);
      console.log(`[Executor] To: ${recipientAddress}`);
      console.log(`[Executor] TX Hash: ${flareTxHash}`);
      console.log(`[Executor] Explorer: https://coston2-explorer.flare.network/tx/${flareTxHash}`);
      console.log(`${'='.repeat(60)}\n`);
    }

    // Update status to completed
    await updateTransaction(xrplTxHash, {
      status: 'completed',
      flareTxHash,
      flareSmartAccount: recipientAddress,
    });

    console.log(`[Executor] Transaction ${xrplTxHash} completed via ${strategyName}`);
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
