'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWalletStore } from '@/store/wallet';
import { checkWalletConnection } from '@/lib/gemwallet';
import { getStrategies, type Strategy } from '@/lib/api';
import { WalletConnect } from '@/components/WalletConnect';
import { StrategyCard } from '@/components/StrategyCard';
import { AmountInput } from '@/components/AmountInput';
import { TransactionFlow } from '@/components/TransactionFlow';
import { Holdings } from '@/components/Holdings';
import { SuccessView } from '@/components/SuccessView';

export default function Home() {
  const {
    isConnected,
    currentStep,
    selectedStrategy,
    error,
    setWalletState,
    setSelectedStrategy,
    setCurrentStep,
    setError,
    reset,
  } = useWalletStore();

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);

  // Check wallet connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const state = await checkWalletConnection();
      if (state.isConnected) {
        setWalletState(state);
      }
    };
    checkConnection();
  }, [setWalletState]);

  // Fetch strategies
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const data = await getStrategies();
        setStrategies(data);
      } catch (error) {
        console.error('Failed to fetch strategies:', error);
      } finally {
        setIsLoadingStrategies(false);
      }
    };
    fetchStrategies();
  }, []);

  const handleStrategySelect = (strategy: Strategy) => {
    if (!strategy.enabled) return;
    setSelectedStrategy(strategy);
  };

  const handleContinueToConfirm = () => {
    setCurrentStep('confirm');
  };

  const handleBackToStrategy = () => {
    setSelectedStrategy(null);
  };

  const handleBackToAmount = () => {
    setCurrentStep('amount');
  };

  const handleSuccess = useCallback(() => {
    // Refresh holdings after successful deposit
    setCurrentStep('success');
  }, [setCurrentStep]);

  const handleNewDeposit = () => {
    reset();
  };

  const handleDismissError = () => {
    setError(null);
    if (isConnected) {
      setCurrentStep('select');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">X</span>
            </div>
            <span className="font-bold text-xl text-zinc-900 dark:text-zinc-100">XRPfi</span>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
              <button
                onClick={handleDismissError}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
              {/* Not Connected */}
              {currentStep === 'connect' && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                    1-Click Yield on Flare
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-md mx-auto">
                    Connect your XRPL wallet to start earning yield on your XRP through Flare&apos;s DeFi ecosystem.
                  </p>
                  <WalletConnect />
                  <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
                    Don&apos;t have GemWallet?{' '}
                    <a
                      href="https://gemwallet.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Install it here
                    </a>
                  </p>
                </div>
              )}

              {/* Select Strategy */}
              {currentStep === 'select' && (
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                    Select a Yield Strategy
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                    Choose how you want to earn yield on your XRP.
                  </p>

                  {isLoadingStrategies ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="animate-pulse p-6 rounded-xl border-2 border-zinc-200 dark:border-zinc-700">
                          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-4" />
                          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3 mb-4" />
                          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {strategies.map((strategy) => (
                        <StrategyCard
                          key={strategy.id}
                          strategy={strategy}
                          isSelected={selectedStrategy?.id === strategy.id}
                          onSelect={() => handleStrategySelect(strategy)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Enter Amount */}
              {currentStep === 'amount' && (
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                    Enter Amount
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                    How much XRP would you like to deposit?
                  </p>
                  <AmountInput
                    onContinue={handleContinueToConfirm}
                    onBack={handleBackToStrategy}
                  />
                </div>
              )}

              {/* Confirm & Processing */}
              {(currentStep === 'confirm' || currentStep === 'processing') && (
                <TransactionFlow
                  onBack={handleBackToAmount}
                  onSuccess={handleSuccess}
                />
              )}

              {/* Success */}
              {currentStep === 'success' && (
                <SuccessView onNewDeposit={handleNewDeposit} />
              )}
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Holdings */}
            {isConnected && <Holdings />}

            {/* Info Card */}
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                How It Works
              </h3>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Connect your XRPL wallet (GemWallet)
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Select a yield strategy and enter amount
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Sign one transaction - we handle the rest
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                    4
                  </span>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Earn yield automatically in your Flare Smart Account
                  </p>
                </li>
              </ol>
            </div>

            {/* Powered By */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center">
                Powered by Flare Smart Accounts & FAssets
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
