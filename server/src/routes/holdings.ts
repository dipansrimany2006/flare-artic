import { Hono } from 'hono';
import {
  xrplAddressToFlareAddress,
  getFirelightUserInfo,
  getFirelightVaultStatus,
  getUpshiftUserInfo,
  getUpshiftVaultStatus,
  FIRELIGHT_VAULT,
  UPSHIFT_VAULT,
  FXRP_TOKEN_ADDRESS,
  getTokenBalance,
} from '../lib/flare';
import type { Address } from 'viem';

const holdings = new Hono();

// GET /api/holdings/:xrplAddress - Get holdings for an XRPL address
holdings.get('/:xrplAddress', async (c) => {
  const xrplAddress = c.req.param('xrplAddress');

  try {
    // Derive Flare address from XRPL address
    const flareAddress = xrplAddressToFlareAddress(xrplAddress);

    // Get token balances and vault info in parallel
    let fxrpBalance = '0';
    let firelightShares = '0';
    let firelightAssetsValue = '0';
    let firelightExchangeRate = '1.000000';
    let upshiftShares = '0';
    let upshiftAssetsValue = '0';
    let upshiftExchangeRate = '1.000000';

    try {
      // Get FXRP balance if token address is configured
      if (FXRP_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        fxrpBalance = await getTokenBalance(FXRP_TOKEN_ADDRESS, flareAddress);
      }

      // Get vault holdings in parallel
      const [firelightInfo, firelightStatus, upshiftInfo, upshiftStatus] = await Promise.all([
        getFirelightUserInfo(flareAddress),
        getFirelightVaultStatus(),
        getUpshiftUserInfo(flareAddress),
        getUpshiftVaultStatus(),
      ]);

      firelightShares = firelightInfo.shares;
      firelightAssetsValue = firelightInfo.assetsValue;
      firelightExchangeRate = firelightStatus.exchangeRate;

      upshiftShares = upshiftInfo.shares;
      upshiftAssetsValue = upshiftInfo.assetsValue;
      upshiftExchangeRate = upshiftStatus.exchangeRate;
    } catch (error) {
      console.error('[Holdings] Error fetching balances:', error);
    }

    // Calculate total value in XRP
    const fxrpValue = parseFloat(fxrpBalance);
    const firelightValue = parseFloat(firelightAssetsValue);
    const upshiftValue = parseFloat(upshiftAssetsValue);
    const totalValueXRP = (fxrpValue + firelightValue + upshiftValue).toFixed(6);

    return c.json({
      xrplAddress,
      flareAddress,
      holdings: {
        fxrp: {
          balance: fxrpBalance,
          valueXRP: fxrpBalance,
        },
        firelight: {
          shares: firelightShares,
          assetsValue: firelightAssetsValue,
          exchangeRate: firelightExchangeRate,
        },
        upshift: {
          shares: upshiftShares,
          assetsValue: upshiftAssetsValue,
          exchangeRate: upshiftExchangeRate,
        },
        totalValueXRP,
      },
    });
  } catch (error: any) {
    console.error('[Holdings] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/holdings/vault/firelight - Get Firelight vault status
holdings.get('/vault/firelight', async (c) => {
  try {
    const status = await getFirelightVaultStatus();

    return c.json({
      vault: FIRELIGHT_VAULT,
      name: 'Firelight',
      assetAddress: status.assetAddress,
      totalAssets: status.totalAssets,
      totalSupply: status.totalSupply,
      exchangeRate: status.exchangeRate,
      currentPeriod: status.currentPeriod.toString(),
      currentPeriodStart: new Date(Number(status.currentPeriodStart) * 1000).toISOString(),
      currentPeriodEnd: new Date(Number(status.currentPeriodEnd) * 1000).toISOString(),
      nextPeriodEnd: new Date(Number(status.nextPeriodEnd) * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('[Holdings] Error fetching Firelight vault status:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/holdings/vault/upshift - Get Upshift vault status
holdings.get('/vault/upshift', async (c) => {
  try {
    const status = await getUpshiftVaultStatus();

    return c.json({
      vault: UPSHIFT_VAULT,
      name: 'Upshift',
      assetAddress: status.assetAddress,
      totalAssets: status.totalAssets,
      totalSupply: status.totalSupply,
      exchangeRate: status.exchangeRate,
    });
  } catch (error: any) {
    console.error('[Holdings] Error fetching Upshift vault status:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/holdings/vaults - Get all vaults status
holdings.get('/vaults', async (c) => {
  try {
    const [firelightStatus, upshiftStatus] = await Promise.all([
      getFirelightVaultStatus(),
      getUpshiftVaultStatus(),
    ]);

    return c.json({
      vaults: [
        {
          id: 'firelight',
          address: FIRELIGHT_VAULT,
          name: 'Firelight',
          assetAddress: firelightStatus.assetAddress,
          totalAssets: firelightStatus.totalAssets,
          totalSupply: firelightStatus.totalSupply,
          exchangeRate: firelightStatus.exchangeRate,
        },
        {
          id: 'upshift',
          address: UPSHIFT_VAULT,
          name: 'Upshift',
          assetAddress: upshiftStatus.assetAddress,
          totalAssets: upshiftStatus.totalAssets,
          totalSupply: upshiftStatus.totalSupply,
          exchangeRate: upshiftStatus.exchangeRate,
        },
      ],
    });
  } catch (error: any) {
    console.error('[Holdings] Error fetching vaults status:', error);
    return c.json({ error: error.message }, 500);
  }
});

export { holdings };
