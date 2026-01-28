'use client';

import Image from 'next/image';
import { useWalletStore, PROTOCOLS } from '@/store/wallet';

interface SuccessViewProps {
  onNewDeposit: () => void;
}

export function SuccessView({ onNewDeposit }: SuccessViewProps) {
  const { amount, allocation, txStatus } = useWalletStore();

  const numAmount = parseFloat(amount) || 0;
  const firelightAmount = (numAmount * allocation.firelight / 100).toFixed(4);
  const upshiftAmount = (numAmount * allocation.upshift / 100).toFixed(4);

  // Calculate weighted average APY
  const firelightApy = parseFloat(PROTOCOLS.firelight.apy);
  const upshiftApy = parseFloat(PROTOCOLS.upshift.apy);
  const weightedApy = (firelightApy * allocation.firelight / 100) + (upshiftApy * allocation.upshift / 100);

  // Determine allocation description
  const getAllocationDesc = () => {
    if (allocation.firelight === 100) return 'Firelight Staking';
    if (allocation.upshift === 100) return 'Upshift Vault';
    return `${allocation.firelight}% Firelight / ${allocation.upshift}% Upshift`;
  };

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Deposit Successful!
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400">
          Your {amount} XRP has been deposited into {getAllocationDesc()}
        </p>
      </div>

      <div className="p-6 bg-zinc-50 dark:bg-neutral-800 rounded-xl space-y-3">
        <div className="flex justify-between">
          <span className="text-zinc-600 dark:text-zinc-400">Amount Deposited</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{amount} XRP</span>
        </div>

        {/* Allocation Breakdown */}
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

        <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-neutral-700">
          <span className="text-zinc-600 dark:text-zinc-400">Blended APY</span>
          <span className="font-medium text-amber-600 dark:text-amber-400">{weightedApy.toFixed(1)}%</span>
        </div>

        {txStatus?.flareSmartAccount && (
          <div className="pt-3 border-t border-zinc-200 dark:border-neutral-700">
            <div className="flex justify-between items-center">
              <span className="text-zinc-600 dark:text-zinc-400">Flare Address</span>
              <a
                href={`https://coston2-explorer.flare.network/address/${txStatus.flareSmartAccount}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-600 dark:text-amber-400 hover:underline font-mono"
              >
                {txStatus.flareSmartAccount.slice(0, 8)}...{txStatus.flareSmartAccount.slice(-6)}
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-transparent dark:border-amber-500/20">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          You now hold yield-bearing tokens in your Flare address. Your yield will automatically accrue over time.
        </p>
      </div>

      <button
        onClick={onNewDeposit}
        className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
      >
        Make Another Deposit
      </button>
    </div>
  );
}
