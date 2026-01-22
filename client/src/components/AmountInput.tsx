'use client';

import { useState } from 'react';
import { useWalletStore } from '@/store/wallet';

interface AmountInputProps {
  onContinue: () => void;
  onBack: () => void;
}

export function AmountInput({ onContinue, onBack }: AmountInputProps) {
  const { amount, setAmount, selectedStrategy } = useWalletStore();
  const [error, setError] = useState<string | null>(null);

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (!/^\d*\.?\d*$/.test(value)) return;
    setAmount(value);
    setError(null);
  };

  const handleContinue = () => {
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount < 1) {
      setError('Minimum amount is 1 XRP');
      return;
    }

    onContinue();
  };

  const presetAmounts = ['10', '50', '100', '500'];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Amount to Deposit
        </label>
        <div className="relative">
          <input
            type="text"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            className={`
              w-full px-4 py-4 pr-16 text-2xl font-semibold
              bg-white dark:bg-zinc-800
              border-2 rounded-xl
              ${error
                ? 'border-red-500 focus:border-red-500'
                : 'border-zinc-200 dark:border-zinc-700 focus:border-blue-500'
              }
              text-zinc-900 dark:text-zinc-100
              placeholder-zinc-400 dark:placeholder-zinc-500
              focus:outline-none transition-colors
            `}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-zinc-500 dark:text-zinc-400">
            XRP
          </span>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      <div className="flex gap-2">
        {presetAmounts.map((preset) => (
          <button
            key={preset}
            onClick={() => handleAmountChange(preset)}
            className={`
              flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors
              ${amount === preset
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }
            `}
          >
            {preset} XRP
          </button>
        ))}
      </div>

      {selectedStrategy && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Strategy</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {selectedStrategy.name}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Expected APY</span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {selectedStrategy.apy}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Est. Fee</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              ~0.2%
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!amount || parseFloat(amount) <= 0}
          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
