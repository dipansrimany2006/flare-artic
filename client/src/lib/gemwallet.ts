'use client';

import {
  isInstalled,
  getAddress,
  getNetwork,
  sendPayment,
  type SendPaymentRequest,
  type SendPaymentResponse,
  type IsInstalledResponse,
  type GetAddressResponse,
  type GetNetworkResponse,
} from '@gemwallet/api';

export interface WalletState {
  isInstalled: boolean;
  isConnected: boolean;
  address: string | null;
  network: string | null;
}

export async function checkWalletConnection(): Promise<WalletState> {
  try {
    const connectionResult: IsInstalledResponse = await isInstalled();

    if (!connectionResult.result.isInstalled) {
      return {
        isInstalled: false,
        isConnected: false,
        address: null,
        network: null,
      };
    }

    // Get address and network
    const [addressResult, networkResult] = await Promise.all([
      getAddress() as Promise<GetAddressResponse>,
      getNetwork() as Promise<GetNetworkResponse>,
    ]);

    return {
      isInstalled: true,
      isConnected: true,
      address: addressResult.result?.address || null,
      network: networkResult.result?.network || null,
    };
  } catch (error) {
    console.error('GemWallet connection check failed:', error);
    return {
      isInstalled: false,
      isConnected: false,
      address: null,
      network: null,
    };
  }
}

export async function connectWallet(): Promise<WalletState> {
  try {
    // GemWallet connects automatically when you request data
    const state = await checkWalletConnection();

    if (!state.isInstalled) {
      throw new Error('GemWallet extension not installed');
    }

    return state;
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    throw error;
  }
}

export interface PaymentParams {
  destination: string;
  amount: string; // in drops
  memo: string;
}

export interface PaymentResult {
  hash: string;
  result: string;
}

export async function signAndSubmitPayment(params: PaymentParams): Promise<PaymentResult> {
  const { destination, amount, memo } = params;

  // Build the payment request
  const paymentRequest: SendPaymentRequest = {
    amount, // In drops for native XRP
    destination,
    memos: [
      {
        memo: {
          memoData: memo, // hex-encoded instruction
          memoType: '746578742F706C61696E', // "text/plain" in hex
        },
      },
    ],
  };

  try {
    const result: SendPaymentResponse = await sendPayment(paymentRequest);

    if (result.type === 'reject') {
      throw new Error('Transaction rejected by user');
    }

    if (result.type === 'response' && result.result) {
      return {
        hash: result.result.hash,
        result: 'tesSUCCESS', // GemWallet only returns on success
      };
    }

    throw new Error('Unknown payment result');
  } catch (error: any) {
    console.error('Payment failed:', error);
    throw new Error(error.message || 'Payment failed');
  }
}

export function getExplorerUrl(txHash: string, network: string | null): string {
  const isTestnet = network === 'Testnet' || network === 'testnet' || network === 'TESTNET';
  const baseUrl = isTestnet
    ? 'https://testnet.xrpl.org/transactions'
    : 'https://livenet.xrpl.org/transactions';
  return `${baseUrl}/${txHash}`;
}
