import { Hono } from 'hono';
import { getTransaction, getTransactionsByAddress } from '../lib/db';

const status = new Hono();

// GET /api/status/:xrplTxHash - Get transaction status
status.get('/:xrplTxHash', async (c) => {
  const xrplTxHash = c.req.param('xrplTxHash');

  const transaction = await getTransaction(xrplTxHash);

  if (!transaction) {
    return c.json({ error: 'Transaction not found' }, 404);
  }

  return c.json({
    xrplTxHash: transaction.xrplTxHash,
    xrplAddress: transaction.xrplAddress,
    xrpAmount: transaction.xrpAmount,
    instructionType: transaction.instructionType,
    status: transaction.status,
    flareSmartAccount: transaction.flareSmartAccount,
    flareTxHash: transaction.flareTxHash,
    error: transaction.errorMessage,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  });
});

// GET /api/status/address/:xrplAddress - Get all transactions for an address
status.get('/address/:xrplAddress', async (c) => {
  const xrplAddress = c.req.param('xrplAddress');

  const transactions = await getTransactionsByAddress(xrplAddress);

  return c.json({
    address: xrplAddress,
    transactions: transactions.map(tx => ({
      xrplTxHash: tx.xrplTxHash,
      xrpAmount: tx.xrpAmount,
      instructionType: tx.instructionType,
      status: tx.status,
      flareSmartAccount: tx.flareSmartAccount,
      flareTxHash: tx.flareTxHash,
      error: tx.errorMessage,
      createdAt: tx.createdAt,
    })),
  });
});

export { status };
