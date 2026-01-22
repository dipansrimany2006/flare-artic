'use client';

import { useWalletStore } from '@/store/wallet';

interface SuccessViewProps {
  onNewDeposit: () => void;
}

export function SuccessView({ onNewDeposit }: SuccessViewProps) {
  const { amount, selectedStrategy, txStatus } = useWalletStore();

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Deposit Successful!
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400">
          Your {amount} XRP has been deposited into {selectedStrategy?.name}
        </p>
      </div>

      <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-3">
        <div className="flex justify-between">
          <span className="text-zinc-600 dark:text-zinc-400">Amount Deposited</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{amount} XRP</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600 dark:text-zinc-400">Strategy</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedStrategy?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600 dark:text-zinc-400">Expected APY</span>
          <span className="font-medium text-green-600 dark:text-green-400">{selectedStrategy?.apy}</span>
        </div>
        {txStatus?.flareSmartAccount && (
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex justify-between items-center">
              <span className="text-zinc-600 dark:text-zinc-400">Smart Account</span>
              <a
                href={`https://coston2-explorer.flare.network/address/${txStatus.flareSmartAccount}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-mono"
              >
                {txStatus.flareSmartAccount.slice(0, 8)}...{txStatus.flareSmartAccount.slice(-6)}
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          You now hold stXRP tokens in your Flare Smart Account. Your yield will automatically accrue over time.
        </p>
      </div>

      <button
        onClick={onNewDeposit}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        Make Another Deposit
      </button>
    </div>
  );
}
