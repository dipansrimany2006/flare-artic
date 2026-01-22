'use client';

import type { Strategy } from '@/lib/api';

interface StrategyCardProps {
  strategy: Strategy;
  isSelected: boolean;
  onSelect: () => void;
}

const riskColors = {
  low: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  high: 'text-red-600 bg-red-100 dark:bg-red-900/30',
};

export function StrategyCard({ strategy, isSelected, onSelect }: StrategyCardProps) {
  const isDisabled = !strategy.enabled;

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`
        w-full p-6 rounded-xl border-2 transition-all text-left
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
        }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {strategy.name}
        </h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${riskColors[strategy.risk]}`}>
          {strategy.risk} risk
        </span>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        {strategy.description}
      </p>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
            Expected APY
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {strategy.apy}
          </p>
        </div>

        {isSelected && (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Selected</span>
          </div>
        )}

        {isDisabled && (
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            Coming Soon
          </span>
        )}
      </div>
    </button>
  );
}
