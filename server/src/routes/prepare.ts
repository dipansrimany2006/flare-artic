import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getOperatorAddress } from '../lib/xrpl';
import { encodeInstruction, xrpToDrops, FIRELIGHT_VAULT, FASSETS_AGENT_VAULT } from '../lib/instruction';
import { STRATEGIES } from './strategies';

const prepare = new Hono();

const prepareSchema = z.object({
  xrplAddress: z.string().min(25).max(35),
  strategy: z.string(),
  amountXRP: z.string().transform(val => parseFloat(val)),
});

// POST /api/prepare - Prepare a transaction for signing
prepare.post('/', zValidator('json', prepareSchema), async (c) => {
  const { xrplAddress, strategy, amountXRP } = c.req.valid('json');

  // Validate strategy
  const selectedStrategy = STRATEGIES.find(s => s.id === strategy);
  if (!selectedStrategy) {
    return c.json({ error: 'Invalid strategy' }, 400);
  }

  if (!selectedStrategy.enabled) {
    return c.json({ error: 'Strategy is not enabled' }, 400);
  }

  // Validate amount (minimum 0.1 XRP for testing)
  if (amountXRP < 0.1) {
    return c.json({ error: 'Minimum amount is 0.1 XRP' }, 400);
  }

  try {
    // Get operator address
    const destinationAddress = getOperatorAddress();

    // Encode instruction memo
    // For Firelight: use Firelight vault address
    // Vault ID is 0 for default vault
    // Lots = amount in XRP (simplified, real implementation would calculate lots)
    const lots = Math.round(amountXRP * 10); // 1 lot = 0.1 XRP for testing
    const memo = encodeInstruction(
      'firelight',
      FIRELIGHT_VAULT,
      0, // vault ID
      lots
    );

    // Convert amount to drops
    const amountDrops = xrpToDrops(amountXRP);

    // Estimate fees
    const estimatedFees = {
      xrplFee: '0.000012', // Standard XRPL tx fee
      mintingFee: (amountXRP * 0.002).toFixed(6), // ~0.2% minting fee
      totalXRP: (amountXRP * 1.002 + 0.000012).toFixed(6),
    };

    return c.json({
      destinationAddress,
      memo,
      amountDrops,
      estimatedFees,
      strategy: {
        id: selectedStrategy.id,
        name: selectedStrategy.name,
        apy: selectedStrategy.apy,
      },
    });
  } catch (error: any) {
    console.error('[Prepare] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export { prepare };
