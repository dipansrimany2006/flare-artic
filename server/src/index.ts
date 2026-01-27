import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { strategies } from './routes/strategies';
import { prepare } from './routes/prepare';
import { status } from './routes/status';
import { holdings } from './routes/holdings';
import { initXrplClient, startXrplListener, getOperatorAddress } from './lib/xrpl';
import { generateFlareWallet, getOperatorFlareBalance, getPlatformFXRPBalance, FXRP_TOKEN_ADDRESS } from './lib/flare';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'XRPfi Yield Maximizer API',
    version: '1.0.0',
    status: 'running',
  });
});

// API routes
app.route('/api/strategies', strategies);
app.route('/api/prepare', prepare);
app.route('/api/status', status);
app.route('/api/holdings', holdings);

// Operator info endpoint (for debugging)
app.get('/api/operator', async (c) => {
  try {
    const xrplAddress = getOperatorAddress();
    let flareBalance = '0';
    let fxrpBalance = '0';

    try {
      flareBalance = await getOperatorFlareBalance();
    } catch {
      // Flare wallet not configured
    }

    try {
      fxrpBalance = await getPlatformFXRPBalance();
    } catch {
      // FXRP token not configured
    }

    return c.json({
      xrplAddress,
      flareBalance,
      fxrpBalance,
      fxrpTokenAddress: FXRP_TOKEN_ADDRESS,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Generate wallets endpoint (for setup)
app.post('/api/generate-wallets', async (c) => {
  const flareWallet = generateFlareWallet();

  return c.json({
    message: 'Add these to your .env file',
    flare: {
      address: flareWallet.address,
      privateKey: flareWallet.privateKey,
    },
    note: 'XRPL wallet will be generated on first startup if XRPL_OPERATOR_SECRET is not set',
  });
});

// Initialize and start
async function init() {
  console.log('='.repeat(50));
  console.log('XRPfi Yield Maximizer - Backend');
  console.log('='.repeat(50));

  // Initialize XRPL client and get/generate operator wallet
  console.log('\n[Init] Initializing XRPL client...');
  const xrplWallet = await initXrplClient();
  console.log(`[Init] XRPL Operator Address: ${xrplWallet.address}`);

  if (!process.env.XRPL_OPERATOR_SECRET) {
    console.log('\n[Init] ⚠️  Save this to your .env file:');
    console.log(`XRPL_OPERATOR_SECRET=${xrplWallet.secret}`);
  }

  // Check Flare operator wallet
  if (!process.env.FLARE_OPERATOR_PRIVATE_KEY) {
    console.log('\n[Init] Flare operator wallet not configured.');
    console.log('[Init] Generate one with POST /api/generate-wallets');
    console.log('[Init] Then fund it with C2FLR from: https://faucet.flare.network');
  } else {
    try {
      const balance = await getOperatorFlareBalance();
      console.log(`[Init] Flare Operator Balance: ${balance} C2FLR`);
    } catch (error) {
      console.log('[Init] Could not fetch Flare balance');
    }
  }

  // Check FXRP token configuration
  if (!process.env.FXRP_TOKEN_ADDRESS || FXRP_TOKEN_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.log('\n[Init] FXRP token address not configured.');
    console.log('[Init] Set FXRP_TOKEN_ADDRESS in .env to enable FXRP transfers to smart accounts.');
  } else {
    try {
      const fxrpBalance = await getPlatformFXRPBalance();
      console.log(`[Init] Platform FXRP Balance: ${fxrpBalance} FXRP`);
    } catch (error) {
      console.log('[Init] Could not fetch FXRP balance');
    }
  }

  // Start XRPL listener
  console.log('\n[Init] Starting XRPL payment listener...');
  await startXrplListener();

  console.log('\n[Init] Server ready!');
  console.log('='.repeat(50));
}

// Start initialization
init().catch(console.error);

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
};
