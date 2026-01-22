'use client';

import { useState, useEffect } from 'react';
import { useWalletStore } from '@/store/wallet';
import { prepareTransaction, getTransactionStatus } from '@/lib/api';
import { signAndSubmitPayment, getExplorerUrl } from '@/lib/gemwallet';

interface TransactionFlowProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function TransactionFlow({ onBack, onSuccess }: TransactionFlowProps) {
  const {
    address,
    network,
    selectedStrategy,
    amount,
    currentStep,
    txHash,
    txStatus,
    setCurrentStep,
    setTxHash,
    setTxStatus,
    setError,
  } = useWalletStore();

  const [isLoading, setIsLoading] = useState(false);
  const [preparedTx, setPreparedTx] = useState<{
    destinationAddress: string;
    memo: string;
    amountDrops: string;
    estimatedFees: { totalXRP: string };
  } | null>(null);

  // Prepare transaction on mount
  useEffect(() => {
    if (!address || !selectedStrategy || !amount) return;

    const prepare = async () => {
      try {
        const result = await prepareTransaction(address, selectedStrategy.id, amount);
        setPreparedTx(result);
      } catch (error: any) {
        setError(error.message);
      }
    };

    prepare();
  }, [address, selectedStrategy, amount, setError]);

  // Poll for transaction status
  useEffect(() => {
    if (!txHash || currentStep !== 'processing') return;

    let intervalId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const pollStatus = async () => {
      if (isCancelled) return;

      try {
        const status = await getTransactionStatus(txHash);
        if (isCancelled) return;

        setTxStatus(status);

        if (status.status === 'completed') {
          if (intervalId) clearInterval(intervalId);
          isCancelled = true;
          setCurrentStep('success');
          onSuccess();
        } else if (status.status === 'failed') {
          if (intervalId) clearInterval(intervalId);
          isCancelled = true;
          setError(status.error || 'Transaction failed');
        }
      } catch {
        // Transaction might not be in our system yet
        console.log('Waiting for transaction to be processed...');
      }
    };

    // Initial poll after short delay
    const timeoutId = setTimeout(pollStatus, 1000);

    // Then poll every 5 seconds
    intervalId = setInterval(pollStatus, 5000);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txHash, currentStep]);

  const handleSign = async () => {
    if (!preparedTx || !address) return;

    setIsLoading(true);
    try {
      const result = await signAndSubmitPayment({
        destination: preparedTx.destinationAddress,
        amount: preparedTx.amountDrops,
        memo: preparedTx.memo,
      });

      setTxHash(result.hash);
      setCurrentStep('processing');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStep === 'processing') {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 mx-auto relative">
          <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full" />
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>

        <div>
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Processing Your Deposit
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {txStatus?.status === 'pending' && 'Waiting for XRPL confirmation...'}
            {txStatus?.status === 'proving' && 'Getting FDC attestation proof...'}
            {txStatus?.status === 'executing' && 'Executing on Flare...'}
            {!txStatus && 'Detecting payment on XRPL...'}
          </p>
        </div>

        {txHash && (
          <a
            href={getExplorerUrl(txHash, network)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View on XRPL Explorer
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}

        <div className="pt-4">
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This usually takes 2-5 minutes
          </div>
        </div>
      </div>
    );
  }

  // Confirm step
  return (
    <div className="space-y-6">
      <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Confirm Your Deposit
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Amount</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {amount} XRP
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Strategy</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {selectedStrategy?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Expected APY</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {selectedStrategy?.apy}
            </span>
          </div>
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Est. Fees</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                ~{preparedTx ? (parseFloat(preparedTx.estimatedFees.totalXRP) - parseFloat(amount)).toFixed(4) : '0'} XRP
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            You&apos;ll receive stXRP tokens in your Flare Smart Account. These are liquid and can be used in other DeFi protocols.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 py-3 px-4 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSign}
          disabled={isLoading || !preparedTx}
          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing...
            </>
          ) : (
            'Sign & Deposit'
          )}
        </button>
      </div>
    </div>
  );
}
