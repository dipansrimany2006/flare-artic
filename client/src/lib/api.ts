const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  apy: string;
  risk: 'low' | 'medium' | 'high';
  enabled: boolean;
}

export interface PrepareResponse {
  destinationAddress: string;
  memo: string;
  amountDrops: string;
  estimatedFees: {
    xrplFee: string;
    mintingFee: string;
    totalXRP: string;
  };
  strategy: {
    id: string;
    name: string;
    apy: string;
  };
}

export interface StatusResponse {
  xrplTxHash: string;
  xrplAddress: string;
  xrpAmount: string;
  instructionType: string;
  status: 'pending' | 'proving' | 'executing' | 'completed' | 'failed';
  flareSmartAccount: string | null;
  flareTxHash: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HoldingsResponse {
  xrplAddress: string;
  flareSmartAccount: string | null;
  holdings: {
    fxrpBalance: string;
    stXrpBalance: string;
    totalValueXRP: string;
  };
  message?: string;
}

export async function getStrategies(): Promise<Strategy[]> {
  const response = await fetch(`${API_URL}/api/strategies`);
  if (!response.ok) throw new Error('Failed to fetch strategies');
  const data = await response.json();
  return data.strategies;
}

export async function prepareTransaction(
  xrplAddress: string,
  strategy: string,
  amountXRP: string
): Promise<PrepareResponse> {
  const response = await fetch(`${API_URL}/api/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xrplAddress, strategy, amountXRP }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to prepare transaction');
  }
  return response.json();
}

export async function getTransactionStatus(xrplTxHash: string): Promise<StatusResponse> {
  const response = await fetch(`${API_URL}/api/status/${xrplTxHash}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Transaction not found');
    }
    throw new Error('Failed to fetch status');
  }
  return response.json();
}

export async function getHoldings(xrplAddress: string): Promise<HoldingsResponse> {
  const response = await fetch(`${API_URL}/api/holdings/${xrplAddress}`);
  if (!response.ok) throw new Error('Failed to fetch holdings');
  return response.json();
}

export async function getOperatorInfo(): Promise<{ xrplAddress: string; flareBalance: string }> {
  const response = await fetch(`${API_URL}/api/operator`);
  if (!response.ok) throw new Error('Failed to fetch operator info');
  return response.json();
}
