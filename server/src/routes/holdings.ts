import { Hono } from 'hono';
import { getSmartAccount, getTokenBalance, FIRELIGHT_VAULT } from '../lib/flare';
import type { Address } from 'viem';

const holdings = new Hono();

// Known token addresses on Coston2 (these would be the real addresses in production)
const TOKENS = {
  FXRP: '0x0000000000000000000000000000000000000000' as Address, // Placeholder
  stXRP: FIRELIGHT_VAULT as Address, // stXRP from Firelight
};

// GET /api/holdings/:xrplAddress - Get holdings for an XRPL address
holdings.get('/:xrplAddress', async (c) => {
  const xrplAddress = c.req.param('xrplAddress');

  try {
    // Get the user's Flare smart account
    const smartAccount = await getSmartAccount(xrplAddress);

    if (!smartAccount) {
      return c.json({
        xrplAddress,
        flareSmartAccount: null,
        holdings: {
          fxrpBalance: '0',
          stXrpBalance: '0',
          totalValueXRP: '0',
        },
        message: 'No smart account found. Make your first deposit to create one.',
      });
    }

    // Get token balances
    let fxrpBalance = '0';
    let stXrpBalance = '0';

    try {
      // In production, query actual token contracts
      // For now, return placeholder values
      // fxrpBalance = await getTokenBalance(TOKENS.FXRP, smartAccount);
      // stXrpBalance = await getTokenBalance(TOKENS.stXRP, smartAccount);

      // Placeholder: would query actual balances
      fxrpBalance = '0';
      stXrpBalance = '0';
    } catch (error) {
      console.error('[Holdings] Error fetching balances:', error);
    }

    // Calculate total value in XRP (assuming 1:1 for FXRP, slight premium for stXRP)
    const fxrpValue = parseFloat(fxrpBalance);
    const stXrpValue = parseFloat(stXrpBalance) * 1.0; // stXRP might have accrued value
    const totalValueXRP = (fxrpValue + stXrpValue).toFixed(6);

    return c.json({
      xrplAddress,
      flareSmartAccount: smartAccount,
      holdings: {
        fxrpBalance,
        stXrpBalance,
        totalValueXRP,
      },
    });
  } catch (error: any) {
    console.error('[Holdings] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export { holdings };
