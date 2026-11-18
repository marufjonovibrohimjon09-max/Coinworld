import { useMemo, useState } from 'react';
import { Award, Crown, Medal, Trophy } from 'lucide-react';
import { LeaderboardEntry } from '../types/coinworld';
import { formatCoins, triggerHaptic } from '../lib/telegram';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardView({ entries }: LeaderboardViewProps) {
  const [sortBy, setSortBy] = useState<'balance' | 'referrals'>('balance');

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) =>
      sortBy === 'balance' ? b.balance - a.balance : b.referralsCount - a.referralsCount
    );
  }, [entries, sortBy]);

  const currentUserIndex = sorted.findIndex((e) => e.isCurrentUser);
  const currentUserEntry = currentUserIndex >= 0 ? sorted[currentUserIndex] : null;
  const topThree = sorted.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#F5F2EB]">
            Reyting jadvali
          </h1>
          <p className="text-sm text-[#A39E93] mt-1">
            COIN WORLD ekotizimidagi eng faol va peshqadam ishtirokchilar.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-[#13151B] border border-white/10 rounded-xl self-start">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSortBy('balance');
            }}
            className={`min-h-[40px] px-4 py-1.5 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              sortBy === 'balance'
                ? 'bg-[#D4AF37] text-[#0A0B0E] font-semibold'
                : 'text-[#A39E93] hover:text-[#F5F2EB]'
            }`}
          >
            Balans bo‘yicha
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSortBy('referrals');
            }}
            className={`min-h-[40px] px-4 py-1.5 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              sortBy === 'referrals'
                ? 'bg-[#D4AF37] text-[#0A0B0E] font-semibold'
                : 'text-[#A39E93] hover:text-[#F5F2EB]'
            }`}
          >
            Referallar bo‘yicha
          </button>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topThree.map((entry, idx) => {
          const Icon = idx === 0 ? Crown : idx === 1 ? Award : Medal;
          return (
            <div
              key={entry.id}
              className={`rounded-2xl p-5 border flex flex-col justify-between gap-4 ${
                idx === 0
                  ? 'bg-[#1D1910] border-[#D4AF37]/50'
                  : 'bg-[#13151B] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono tabular-nums text-sm font-bold text-[#D4AF37]">
                  #{idx + 1} o‘rin
                </span>
                <Icon className="w-5 h-5 text-[#D4AF37]" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[#F5F2EB] truncate">
                  {entry.name} {entry.isCurrentUser ? '(Siz)' : ''}
                </h2>
                <p className="text-xs text-[#A39E93]">
                  {entry.username} · {entry.tier}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm">
                <span className="text-[#A39E93]">
                  {sortBy === 'balance' ? 'Balans' : 'Referallar'}
                </span>
                <span className="font-mono tabular-nums font-bold text-[#F5D77F]">
                  {sortBy === 'balance'
                    ? `${formatCoins(entry.balance)} COIN`
                    : `${entry.referralsCount} nafar`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Current Standing Summary */}
      {currentUserEntry && (
        <div className="bg-[#181A22] border border-[#D4AF37]/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-[#D4AF37] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#F5F2EB]">
                Sizning joriy o‘rningiz: #{currentUserIndex + 1}
              </p>
              <p className="text-xs text-[#A39E93]">
                {currentUserEntry.name} · {currentUserEntry.referralsCount} ta referal
              </p>
            </div>
          </div>
          <p className="font-mono tabular-nums font-bold text-[#F5D77F]">
            {formatCoins(currentUserEntry.balance)} COIN
          </p>
        </div>
      )}

      {/* Full Ranked Table */}
      <div className="bg-[#13151B] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs text-[#A39E93]">
                <th className="py-3.5 px-4 font-medium">O‘rin</th>
                <th className="py-3.5 px-4 font-medium">Ishtirokchi</th>
                <th className="py-3.5 px-4 font-medium">Daraja</th>
                <th className="py-3.5 px-4 font-medium text-right">Referallar</th>
                <th className="py-3.5 px-4 font-medium text-right">Balans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {sorted.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={entry.isCurrentUser ? 'bg-[#221D10]/70' : 'hover:bg-white/[0.02]'}
                >
                  <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-[#D4AF37]">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-[#F5F2EB]">
                      {entry.name} {entry.isCurrentUser ? '(Siz)' : ''}
                    </p>
                    <p className="text-xs text-[#A39E93]">{entry.username}</p>
                  </td>
                  <td className="py-3.5 px-4 text-[#B8B0A0]">{entry.tier}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#F5F2EB]">
                    {entry.referralsCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#F5D77F]">
                    {formatCoins(entry.balance)} COIN
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
