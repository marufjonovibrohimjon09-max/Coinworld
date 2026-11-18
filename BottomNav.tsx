import { Home, CheckSquare, ShoppingBag, Gavel, User } from 'lucide-react';
import { ActiveTab } from '../types/coinworld';
import { triggerHaptic } from '../lib/telegram';

interface BottomNavProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
}

const MOBILE_TABS: {
  id: ActiveTab;
  label: string;
  icon: typeof Home;
}[] = [
  { id: 'home', label: 'Asosiy', icon: Home },
  { id: 'tasks', label: 'Vazifalar', icon: CheckSquare },
  { id: 'marketplace', label: 'Bozor', icon: ShoppingBag },
  { id: 'auction', label: 'Auksion', icon: Gavel },
  { id: 'profile', label: 'Profil', icon: User },
];

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Mobil navigatsiya"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0F14]/95 backdrop-blur-md border-t border-[#D4AF37]/15 pb-safe"
    >
      <div className="grid grid-cols-5 h-14 items-center">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'home' && activeTab === 'leaderboard') ||
            (tab.id === 'profile' && activeTab === 'admin');

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onNavigate(tab.id);
              }}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4AF37] ${
                isActive ? 'text-[#F5D77F]' : 'text-[#8C877D] hover:text-[#D9D4C9]'
              }`}
            >
              <Icon
                className="w-5 h-5"
                strokeWidth={isActive ? 2.2 : 1.75}
              />
              <span className="text-[11px] font-medium tracking-tight leading-none whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
