import { Database } from 'bun:sqlite';
import type { TransactionStatus, InstructionType, Transaction } from '../types';

const db = new Database('xrpfi.db');

// Initialize database
db.run(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    xrpl_tx_hash TEXT NOT NULL UNIQUE,
    xrpl_address TEXT NOT NULL,
    xrp_amount TEXT NOT NULL,
    instruction_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    flare_smart_account TEXT,
    flare_tx_hash TEXT,
    error_message TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

export async function createTransaction(data: {
  xrplTxHash: string;
  xrplAddress: string;
  xrpAmount: string;
  instructionType: InstructionType;
}): Promise<Transaction> {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO transactions (xrpl_tx_hash, xrpl_address, xrp_amount, instruction_type, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `);

  const result = stmt.run(
    data.xrplTxHash,
    data.xrplAddress,
    data.xrpAmount,
    data.instructionType,
    now,
    now
  );

  return {
    id: Number(result.lastInsertRowid),
    xrplTxHash: data.xrplTxHash,
    xrplAddress: data.xrplAddress,
    xrpAmount: data.xrpAmount,
    instructionType: data.instructionType,
    status: 'pending',
    flareSmartAccount: null,
    flareTxHash: null,
    errorMessage: null,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function getTransaction(xrplTxHash: string): Promise<Transaction | null> {
  const stmt = db.prepare('SELECT * FROM transactions WHERE xrpl_tx_hash = ?');
  const row = stmt.get(xrplTxHash) as any;

  if (!row) return null;

  return {
    id: row.id,
    xrplTxHash: row.xrpl_tx_hash,
    xrplAddress: row.xrpl_address,
    xrpAmount: row.xrp_amount,
    instructionType: row.instruction_type as InstructionType,
    status: row.status as TransactionStatus,
    flareSmartAccount: row.flare_smart_account,
    flareTxHash: row.flare_tx_hash,
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function updateTransaction(
  xrplTxHash: string,
  data: Partial<Pick<Transaction, 'status' | 'flareSmartAccount' | 'flareTxHash' | 'errorMessage'>>
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.flareSmartAccount !== undefined) {
    updates.push('flare_smart_account = ?');
    values.push(data.flareSmartAccount);
  }
  if (data.flareTxHash !== undefined) {
    updates.push('flare_tx_hash = ?');
    values.push(data.flareTxHash);
  }
  if (data.errorMessage !== undefined) {
    updates.push('error_message = ?');
    values.push(data.errorMessage);
  }

  updates.push('updated_at = ?');
  values.push(Date.now());
  values.push(xrplTxHash);

  const stmt = db.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE xrpl_tx_hash = ?`);
  stmt.run(...values);
}

export async function getTransactionsByAddress(xrplAddress: string): Promise<Transaction[]> {
  const stmt = db.prepare('SELECT * FROM transactions WHERE xrpl_address = ? ORDER BY created_at DESC');
  const rows = stmt.all(xrplAddress) as any[];

  return rows.map(row => ({
    id: row.id,
    xrplTxHash: row.xrpl_tx_hash,
    xrplAddress: row.xrpl_address,
    xrpAmount: row.xrp_amount,
    instructionType: row.instruction_type as InstructionType,
    status: row.status as TransactionStatus,
    flareSmartAccount: row.flare_smart_account,
    flareTxHash: row.flare_tx_hash,
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}
