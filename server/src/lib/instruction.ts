import type { InstructionType } from '../types';

// Instruction codes from system.md
// Byte 0: High nibble = Type ID, Low nibble = Command ID
// 0x10 = Firelight collateralReservationAndDeposit
// 0x20 = Upshift collateralReservationAndDeposit (future)
export const INSTRUCTION_CODES = {
  firelight: 0x10,
} as const;

// Contract addresses
export const FIRELIGHT_VAULT = '0x91Bfe6A68aB035DFebb6A770FFfB748C03C0E40B';
export const MASTER_ACCOUNT_CONTROLLER = '0x3ab31E2d943d1E8F47B275605E50Ff107f2F8393';

// FAssets agent vault - "fio" agent
// This is the agent vault address for FAssets minting
export const FASSETS_AGENT_VAULT = '0x0000000000000000000000000000000000000000'; // Placeholder - needs real address

/**
 * Encode instruction memo for XRPL payment
 *
 * Byte layout (32 bytes total):
 * - Byte 0: Instruction code (Type ID + Command ID)
 * - Byte 1: Wallet identifier (0 for independent apps)
 * - Bytes 2-21: agentVaultId (20 bytes address)
 * - Bytes 22-25: vaultId (4 bytes)
 * - Bytes 26-31: value in lots (6 bytes)
 */
export function encodeInstruction(
  instructionType: InstructionType,
  agentVaultAddress: string,
  vaultId: number,
  lots: number
): string {
  const buffer = new Uint8Array(32);

  // Byte 0: Instruction code
  buffer[0] = INSTRUCTION_CODES[instructionType];

  // Byte 1: Wallet identifier (0 for independent apps)
  buffer[1] = 0;

  // Bytes 2-21: Agent vault address (20 bytes)
  const agentBytes = hexToBytes(agentVaultAddress.replace('0x', ''));
  buffer.set(agentBytes, 2);

  // Bytes 22-25: Vault ID (4 bytes, big endian)
  buffer[22] = (vaultId >> 24) & 0xff;
  buffer[23] = (vaultId >> 16) & 0xff;
  buffer[24] = (vaultId >> 8) & 0xff;
  buffer[25] = vaultId & 0xff;

  // Bytes 26-31: Value in lots (6 bytes, big endian)
  // For simplicity, using lower 6 bytes
  const lotsHex = lots.toString(16).padStart(12, '0');
  for (let i = 0; i < 6; i++) {
    buffer[26 + i] = parseInt(lotsHex.substring(i * 2, i * 2 + 2), 16);
  }

  return bytesToHex(buffer);
}

/**
 * Decode instruction from XRPL payment memo
 */
export function decodeInstruction(memoHex: string): {
  instructionCode: number;
  walletId: number;
  agentVaultAddress: string;
  vaultId: number;
  lots: number;
} | null {
  try {
    const bytes = hexToBytes(memoHex.replace('0x', ''));
    if (bytes.length !== 32) return null;

    const instructionCode = bytes[0];
    const walletId = bytes[1];
    const agentVaultAddress = '0x' + bytesToHex(bytes.slice(2, 22));
    const vaultId = (bytes[22] << 24) | (bytes[23] << 16) | (bytes[24] << 8) | bytes[25];
    const lots = parseInt(bytesToHex(bytes.slice(26, 32)), 16);

    return {
      instructionCode,
      walletId,
      agentVaultAddress,
      vaultId,
      lots,
    };
  } catch {
    return null;
  }
}

/**
 * Get instruction type from code
 */
export function getInstructionType(code: number): InstructionType | null {
  if (code === INSTRUCTION_CODES.firelight) return 'firelight';
  return null;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert XRP amount to drops (1 XRP = 1,000,000 drops)
 */
export function xrpToDrops(xrp: string | number): string {
  const amount = typeof xrp === 'string' ? parseFloat(xrp) : xrp;
  return Math.floor(amount * 1_000_000).toString();
}

/**
 * Convert drops to XRP
 */
export function dropsToXrp(drops: string | number): string {
  const amount = typeof drops === 'string' ? parseInt(drops, 10) : drops;
  return (amount / 1_000_000).toFixed(6);
}
