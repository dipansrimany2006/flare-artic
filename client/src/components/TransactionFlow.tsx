'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useWalletStore, PROTOCOLS } from '@/store/wallet';
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
    amount,
    allocation,
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

  const numAmount = parseFloat(amount) || 0;
  const firelightAmount = (numAmount * allocation.firelight / 100).toFixed(4);
  const upshiftAmount = (numAmount * allocation.upshift / 100).toFixed(4);

  // Calculate weighted average APY
  const firelightApy = parseFloat(PROTOCOLS.firelight.apy);
  const upshiftApy = parseFloat(PROTOCOLS.upshift.apy);
  const weightedApy = (firelightApy * allocation.firelight / 100) + (upshiftApy * allocation.upshift / 100);

  // Prepare transaction on mount
  useEffect(() => {
    if (!address || !amount) return;

    const prepare = async () => {
      try {
        // Pass allocation to backend for proper instruction encoding
        const result = await prepareTransaction(address, amount, allocation);
        setPreparedTx(result);
      } catch (error: any) {
        setError(error.message);
      }
    };

    prepare();
  }, [address, amount, allocation, setError]);

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

  // Determine current step index for progress
  const getProgressStep = () => {
    if (!txStatus) return 0; // Detecting payment
    if (txStatus.status === 'pending') return 1; // XRPL confirming
    if (txStatus.status === 'proving') return 2; // FDC attestation
    if (txStatus.status === 'executing') return 3; // Executing on Flare
    if (txStatus.status === 'completed') return 4; // Done
    return 0;
  };

  const progressSteps = [
    {
      label: 'Payment Submitted',
      description: 'Transaction sent to XRPL',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      )
    },
    {
      label: 'XRPL Confirmation',
      description: 'Waiting for network confirmation',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'FDC Attestation',
      description: 'Getting cross-chain proof',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      label: 'Flare Execution',
      description: 'Depositing to yield protocols',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
  ];

  if (currentStep === 'processing') {
    const currentProgressStep = getProgressStep();

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Processing Your Deposit
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {amount} XRP → {allocation.firelight === 100 ? 'Firelight' : allocation.upshift === 100 ? 'Upshift' : 'Firelight & Upshift'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="relative">
          {progressSteps.map((step, index) => {
            const isCompleted = index < currentProgressStep;
            const isActive = index === currentProgressStep;
            const isPending = index > currentProgressStep;

            return (
              <div key={index} className="relative flex items-start gap-4 pb-8 last:pb-0">
                {/* Vertical Line */}
                {index < progressSteps.length - 1 && (
                  <div
                    className={`absolute left-5 top-10 w-0.5 h-full -ml-px transition-colors duration-500 ${
                      isCompleted ? 'bg-amber-500' : 'bg-zinc-200 dark:bg-neutral-700'
                    }`}
                  />
                )}

                {/* Step Icon */}
                <div
                  className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-amber-500 border-amber-500 text-black'
                      : isActive
                        ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400'
                        : 'bg-zinc-100 dark:bg-neutral-800 border-zinc-200 dark:border-neutral-700 text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <div className="relative">
                      <div className="absolute inset-0 animate-ping opacity-75">
                        {step.icon}
                      </div>
                      {step.icon}
                    </div>
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 pt-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium transition-colors ${
                        isCompleted || isActive
                          ? 'text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    {isActive && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse delay-150" />
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse delay-300" />
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-sm transition-colors ${
                      isCompleted || isActive
                        ? 'text-zinc-600 dark:text-zinc-400'
                        : 'text-zinc-400 dark:text-zinc-600'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transaction Link */}
        {txHash && (
          <div className="p-4 bg-zinc-50 dark:bg-neutral-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Transaction Hash</p>
                <p className="text-sm font-mono text-zinc-900 dark:text-zinc-100">
                  {txHash.slice(0, 8)}...{txHash.slice(-8)}
                </p>
              </div>
              <a
                href={getExplorerUrl(txHash, network)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors"
              >
                View
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* Time Estimate */}
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          This usually takes 2-5 minutes
        </div>
      </div>
    );
  }

  // Confirm step
  return (
    <div className="space-y-6">
      <div className="p-6 bg-zinc-50 dark:bg-neutral-800 rounded-xl space-y-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Confirm Your Deposit
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Total Amount</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {amount} XRP
            </span>
          </div>

          {/* Allocation Breakdown */}
          <div className="border-t border-zinc-200 dark:border-neutral-700 pt-3 space-y-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">Allocation</span>

            {allocation.firelight > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Image
                    src="/firelight.png"
                    alt="Firelight"
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <span className="text-zinc-600 dark:text-zinc-400">Firelight ({allocation.firelight}%)</span>
                </div>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {firelightAmount} XRP
                </span>
              </div>
            )}

            {allocation.upshift > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Image
                    src="/upshift-logomark.svg"
                    alt="Upshift"
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <span className="text-zinc-600 dark:text-zinc-400">Upshift ({allocation.upshift}%)</span>
                </div>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {upshiftAmount} XRP
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 dark:border-neutral-700 pt-3">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Blended APY</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {weightedApy.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Est. Fees</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              ~{preparedTx ? (parseFloat(preparedTx.estimatedFees.totalXRP) - parseFloat(amount)).toFixed(4) : '0'} XRP
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-transparent dark:border-amber-500/20">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Your FXRP will be deposited to the selected protocols. You&apos;ll receive yield-bearing tokens in return.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 py-3 px-4 border-2 border-zinc-200 dark:border-neutral-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSign}
          disabled={isLoading || !preparedTx}
          className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-black font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
