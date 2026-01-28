'use client';

import Image from 'next/image';
import { useWalletStore, PROTOCOLS } from '@/store/wallet';

export function AllocationSlider() {
  const { amount, allocation, setAllocation } = useWalletStore();
  const numAmount = parseFloat(amount) || 0;

  const handleSliderChange = (value: number) => {
    setAllocation({
      firelight: value,
      upshift: 100 - value,
    });
  };

  const firelightAmount = (numAmount * allocation.firelight / 100).toFixed(4);
  const upshiftAmount = (numAmount * allocation.upshift / 100).toFixed(4);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
          Allocate Your Deposit
        </label>

        {/* Slider */}
        <div className="relative pt-2 pb-6">
          <input
            type="range"
            min="0"
            max="100"
            value={allocation.firelight}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className="w-full h-3 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${allocation.firelight}%, #eab308 ${allocation.firelight}%, #eab308 100%)`,
            }}
          />

          {/* Percentage labels */}
          <div className="flex justify-between mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Protocol Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Firelight Card */}
        <div className={`p-4 rounded-xl border-2 transition-all ${
          allocation.firelight > 0
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
            : 'border-zinc-200 dark:border-neutral-700 opacity-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Image
              src="/firelight.png"
              alt="Firelight"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Firelight</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Allocation</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {allocation.firelight}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Amount</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {firelightAmount} XRP
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">APY</span>
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {PROTOCOLS.firelight.apy}
              </span>
            </div>
          </div>
        </div>

        {/* Upshift Card */}
        <div className={`p-4 rounded-xl border-2 transition-all ${
          allocation.upshift > 0
            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10'
            : 'border-zinc-200 dark:border-neutral-700 opacity-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Image
              src="/upshift-logomark.svg"
              alt="Upshift"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Upshift</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Allocation</span>
              <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                {allocation.upshift}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Amount</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {upshiftAmount} XRP
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">APY</span>
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {PROTOCOLS.upshift.apy}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick allocation buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setAllocation({ firelight: 100, upshift: 0 })}
          className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
            allocation.firelight === 100
              ? 'bg-amber-500 text-black'
              : 'bg-zinc-100 dark:bg-neutral-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-neutral-700'
          }`}
        >
          100% Firelight
        </button>
        <button
          onClick={() => setAllocation({ firelight: 50, upshift: 50 })}
          className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
            allocation.firelight === 50
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black'
              : 'bg-zinc-100 dark:bg-neutral-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-neutral-700'
          }`}
        >
          50/50 Split
        </button>
        <button
          onClick={() => setAllocation({ firelight: 0, upshift: 100 })}
          className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
            allocation.upshift === 100
              ? 'bg-yellow-500 text-black'
              : 'bg-zinc-100 dark:bg-neutral-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-neutral-700'
          }`}
        >
          100% Upshift
        </button>
      </div>
    </div>
  );
}
