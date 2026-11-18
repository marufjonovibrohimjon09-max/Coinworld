import { Coins } from 'lucide-react';
import { ActiveTab } from '../types/coinworld';
import { formatCoins, triggerHaptic } from '../lib/telegram';

interface TopBarProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  balance: number;
  isAdmin?: boolean;
}

const BASE_NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'home', label: 'Asosiy' },
  { id: 'tasks', label: 'Vazifalar' },
  { id: 'marketplace', label: 'Bozor' },
  { id: 'auction', label: 'Auksion' },
  { id: 'leaderboard', label: 'Reyting' },
];

export function TopBar({ activeTab, onNavigate, balance, isAdmin }: TopBarProps) {
  const handleSelect = (tab: ActiveTab) => {
    triggerHaptic('light');
    onNavigate(tab);
  };

  const navItems = isAdmin
    ? [...BASE_NAV_ITEMS, { id: 'admin' as ActiveTab, label: 'Admin' }]
    : BASE_NAV_ITEMS;

  return (
    <header className="sticky top-0 z-30 h-12 md:h-16 bg-[#0A0B0E]/90 backdrop-blur-md border-b border-[#D4AF37]/15">
      <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single text element) */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="font-display text-base md:text-lg font-bold tracking-tight text-[#F5D77F] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded"
        >
          COIN WORLD
        </button>

        {/* Zone 2: Desktop single-line navigation links */}
        <nav className="hidden md:flex items-center gap-5" aria-label="Asosiy navigatsiya">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded ${
                  isActive
                    ? 'text-[#F5D77F]'
                    : 'text-[#A39E93] hover:text-[#F5F2EB]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-[#D4AF37] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action (Balance / Profile shortcut) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleSelect('profile')}
            className="min-h-[36px] md:min-h-[40px] px-3 md:px-4 py-1.5 rounded-lg bg-[#161922] hover:bg-[#1E222E] border border-[#D4AF37]/30 text-[#F5D77F] text-xs md:text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            <Coins className="w-4 h-4 text-[#D4AF37] shrink-0" strokeWidth={2} />
            <span className="font-mono tabular-nums">{formatCoins(balance)}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
