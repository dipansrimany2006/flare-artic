'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useWalletStore } from '@/store/wallet';
import { getHoldings } from '@/lib/api';

export function Holdings() {
  const { address, holdings, setHoldings } = useWalletStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) return;

    const fetchHoldings = async () => {
      setIsLoading(true);
      try {
        const result = await getHoldings(address);
        setHoldings(result);
      } catch (error) {
        console.error('Failed to fetch holdings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHoldings();
  }, [address, setHoldings]);

  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl border border-zinc-200 dark:border-amber-500/20">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-200 dark:bg-neutral-700 rounded w-1/4" />
          <div className="h-8 bg-zinc-200 dark:bg-neutral-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!holdings) {
    return null;
  }

  const hasHoldings =
    parseFloat(holdings.holdings.fxrp.balance) > 0 ||
    parseFloat(holdings.holdings.firelight.shares) > 0 ||
    parseFloat(holdings.holdings.upshift.shares) > 0;

  return (
    <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl border border-zinc-200 dark:border-amber-500/20">
      <h3 className="text-sm font-medium text-zinc-500 dark:text-amber-500/70 uppercase tracking-wider mb-4">
        Your Holdings
      </h3>

      {!hasHoldings ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-zinc-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            {holdings.message || 'No holdings yet. Make your first deposit to get started!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Firelight stXRP Holdings */}
          {parseFloat(holdings.holdings.firelight.shares) > 0 && (
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Image
                  src="/firelight.png"
                  alt="Firelight"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">stXRP</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Firelight Staking</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {parseFloat(holdings.holdings.firelight.shares).toFixed(4)}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  ~{parseFloat(holdings.holdings.firelight.assetsValue).toFixed(2)} XRP
                </p>
              </div>
            </div>
          )}

          {/* Upshift earnXRP Holdings */}
          {parseFloat(holdings.holdings.upshift.shares) > 0 && (
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Image
                  src="/upshift-logomark.svg"
                  alt="Upshift"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">earnXRP</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Upshift Vault</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {parseFloat(holdings.holdings.upshift.shares).toFixed(4)}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  ~{parseFloat(holdings.holdings.upshift.assetsValue).toFixed(2)} XRP
                </p>
              </div>
            </div>
          )}

          {/* FXRP Holdings (undeposited) */}
          {parseFloat(holdings.holdings.fxrp.balance) > 0 && (
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Image
                  src="/FXRP.jpg"
                  alt="FXRP"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">FXRP</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Wrapped XRP on Flare</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {parseFloat(holdings.holdings.fxrp.balance).toFixed(4)}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  ~{parseFloat(holdings.holdings.fxrp.valueXRP).toFixed(2)} XRP
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-200 dark:border-neutral-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Total Value</span>
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {parseFloat(holdings.holdings.totalValueXRP).toFixed(4)} XRP
              </span>
            </div>
          </div>

          {holdings.flareAddress && (
            <div className="pt-4 border-t border-zinc-200 dark:border-neutral-700">
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-1">
                Flare Address
              </p>
              <a
                href={`https://coston2-explorer.flare.network/address/${holdings.flareAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-mono"
              >
                {holdings.flareAddress.slice(0, 10)}...{holdings.flareAddress.slice(-8)}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
