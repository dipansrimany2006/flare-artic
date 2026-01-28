import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getOperatorAddress } from '../lib/xrpl';
import {
  encodeInstruction,
  encodeSplitInstruction,
  xrpToDrops,
  FIRELIGHT_VAULT,
} from '../lib/instruction';
import { STRATEGIES } from './strategies';

const prepare = new Hono();

const prepareSchema = z.object({
  xrplAddress: z.string().min(25).max(35),
  strategy: z.string().optional().default('split'),
  amountXRP: z.string().transform(val => parseFloat(val)),
  allocation: z.object({
    firelight: z.number().min(0).max(100),
    upshift: z.number().min(0).max(100),
  }).optional(),
});

// POST /api/prepare - Prepare a transaction for signing
prepare.post('/', zValidator('json', prepareSchema), async (c) => {
  const { xrplAddress, strategy, amountXRP, allocation } = c.req.valid('json');

  // Default allocation: 50/50 split
  const alloc = allocation || { firelight: 50, upshift: 50 };

  // Validate allocation totals 100%
  if (alloc.firelight + alloc.upshift !== 100) {
    return c.json({ error: 'Allocation must total 100%' }, 400);
  }

  // Validate amount (minimum 0.1 XRP for testing)
  if (amountXRP < 0.1) {
    return c.json({ error: 'Minimum amount is 0.1 XRP' }, 400);
  }

  try {
    // Get operator address
    const destinationAddress = getOperatorAddress();

    // Calculate lots
    const lots = Math.round(amountXRP * 10); // 1 lot = 0.1 XRP for testing

    let memo: string;
    let strategyInfo: { id: string; name: string; apy: string };

    // Determine instruction encoding based on allocation
    if (alloc.firelight === 100) {
      // 100% Firelight
      memo = encodeInstruction('firelight', FIRELIGHT_VAULT, 0, lots);
      const firelightStrategy = STRATEGIES.find(s => s.id === 'firelight')!;
      strategyInfo = {
        id: 'firelight',
        name: firelightStrategy.name,
        apy: firelightStrategy.apy,
      };
    } else if (alloc.upshift === 100) {
      // 100% Upshift
      memo = encodeInstruction('upshift', FIRELIGHT_VAULT, 0, lots);
      const upshiftStrategy = STRATEGIES.find(s => s.id === 'upshift')!;
      strategyInfo = {
        id: 'upshift',
        name: upshiftStrategy.name,
        apy: upshiftStrategy.apy,
      };
    } else {
      // Split between protocols
      memo = encodeSplitInstruction(alloc.firelight, lots);

      // Calculate blended APY
      const firelightApy = 8.5; // From STRATEGIES
      const upshiftApy = 12.3; // From STRATEGIES
      const blendedApy = (firelightApy * alloc.firelight + upshiftApy * alloc.upshift) / 100;

      strategyInfo = {
        id: 'split',
        name: `${alloc.firelight}% Firelight / ${alloc.upshift}% Upshift`,
        apy: `${blendedApy.toFixed(1)}%`,
      };
    }

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
      strategy: strategyInfo,
      allocation: alloc,
    });
  } catch (error: any) {
    console.error('[Prepare] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export { prepare };
