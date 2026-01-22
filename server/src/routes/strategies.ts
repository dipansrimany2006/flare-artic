import { Hono } from 'hono';
import type { Strategy } from '../types';

const strategies = new Hono();

const STRATEGIES: Strategy[] = [
  {
    id: 'firelight',
    name: 'Firelight Staking',
    description: 'Stake FXRP to receive stXRP, a liquid staking token. Earn yield from DeFi cover fees and Firelight Points.',
    apy: '5-8%',
    risk: 'low',
    enabled: true,
    instructionCode: 0x10,
  },
  // Future strategies (disabled for MVP)
  {
    id: 'upshift',
    name: 'Upshift Vault',
    description: 'Deposit FXRP to earn yield from carry trades, AMM liquidity, and Firelight integration.',
    apy: '4-10%',
    risk: 'medium',
    enabled: false,
    instructionCode: 0x20,
  },
];

// GET /api/strategies - List all strategies
strategies.get('/', (c) => {
  return c.json({
    strategies: STRATEGIES.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      apy: s.apy,
      risk: s.risk,
      enabled: s.enabled,
    })),
  });
});

// GET /api/strategies/:id - Get strategy details
strategies.get('/:id', (c) => {
  const id = c.req.param('id');
  const strategy = STRATEGIES.find(s => s.id === id);

  if (!strategy) {
    return c.json({ error: 'Strategy not found' }, 404);
  }

  return c.json({
    id: strategy.id,
    name: strategy.name,
    description: strategy.description,
    apy: strategy.apy,
    risk: strategy.risk,
    enabled: strategy.enabled,
  });
});

export { strategies, STRATEGIES };
