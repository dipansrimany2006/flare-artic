'use client';

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
            className="w-full h-3 bg-gradient-to-r from-orange-500 to-purple-500 rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: `linear-gradient(to right, #f97316 0%, #f97316 ${allocation.firelight}%, #a855f7 ${allocation.firelight}%, #a855f7 100%)`,
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
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
            : 'border-zinc-200 dark:border-zinc-700 opacity-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Firelight</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Allocation</span>
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
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
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {PROTOCOLS.firelight.apy}
              </span>
            </div>
          </div>
        </div>

        {/* Upshift Card */}
        <div className={`p-4 rounded-xl border-2 transition-all ${
          allocation.upshift > 0
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-zinc-200 dark:border-zinc-700 opacity-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Upshift</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Allocation</span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
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
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
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
              ? 'bg-orange-600 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          100% Firelight
        </button>
        <button
          onClick={() => setAllocation({ firelight: 50, upshift: 50 })}
          className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
            allocation.firelight === 50
              ? 'bg-gradient-to-r from-orange-600 to-purple-600 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          50/50 Split
        </button>
        <button
          onClick={() => setAllocation({ firelight: 0, upshift: 100 })}
          className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
            allocation.upshift === 100
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          100% Upshift
        </button>
      </div>
    </div>
  );
}
