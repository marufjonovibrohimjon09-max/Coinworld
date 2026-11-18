import { useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Gift,
  Share2,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import {
  ActiveTab,
  AuctionItem,
  DailyBonusDay,
  LeaderboardEntry,
  ReferralFriend,
  UserProfile,
} from '../types/coinworld';
import {
  HERO_EMBLEM_IMAGE,
  MAX_REFERRALS_LIMIT,
  REFERRAL_REWARD_COINS,
} from '../config/catalog';
import { formatCoins, shareViaTelegram, triggerHaptic } from '../lib/telegram';
import { SmartImage } from './SmartImage';

interface HomeViewProps {
  user: UserProfile;
  dailyDays: DailyBonusDay[];
  canClaimDaily: boolean;
  onClaimDaily: () => void;
  referrals: ReferralFriend[];
  botUsername: string;
  onNavigate: (tab: ActiveTab) => void;
  topLeaderboard: LeaderboardEntry[];
  featuredAuction: AuctionItem | undefined;
  pendingTasksCount: number;
  allowDemoMode: boolean;
  onSimulateReferralJoin: () => void;
}

export function HomeView({
  user,
  dailyDays,
  canClaimDaily,
  onClaimDaily,
  referrals,
  botUsername,
  onNavigate,
  topLeaderboard,
  featuredAuction,
  pendingTasksCount,
  allowDemoMode,
  onSimulateReferralJoin,
}: HomeViewProps) {
  const [copied, setCopied] = useState(false);

  const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;
  const currentDayNumber = canClaimDaily
    ? (user.dailyStreak % 7) + 1
    : user.dailyStreak === 0
      ? 1
      : user.dailyStreak;

  const handleCopyLink = async () => {
    triggerHaptic('success');
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      // Clipboard fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleShareTelegram = () => {
    triggerHaptic('medium');
    shareViaTelegram(
      referralLink,
      `COIN WORLD ilovasiga qo‘shiling va darhol bonus COINlarga ega bo‘ling!`
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero Vault Split Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-[#13151B] border border-[#D4AF37]/20 rounded-2xl p-6 md:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#A39E93]">
              <span>Shaxsiy hamyon</span>
              <span aria-hidden="true">·</span>
              <span>{user.tier}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">ID {user.telegramId}</span>
            </div>

            <div>
              <p className="text-sm text-[#B8B0A0] mb-1">Joriy COIN balansingiz</p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#F5D77F] font-mono tabular-nums">
                  {formatCoins(user.balance)}
                </h1>
                <span className="text-base font-semibold text-[#D4AF37]">COIN</span>
              </div>
              <p className="mt-2 text-sm text-[#A39E93] max-w-xl leading-relaxed">
                Xush kelibsiz, {user.fullName}. Vazifalarni bajaring, kunlik bonuslarni yig‘ing va
                auksion hamda bozor imkoniyatlaridan foydalaning.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                onNavigate('marketplace');
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E5B84B] to-[#C89B2B] hover:from-[#F2CA63] hover:to-[#D4AF37] text-[#0A0B0E] font-semibold text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-transform duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5D77F]"
            >
              <Wallet className="w-4 h-4" />
              <span>COIN sotib olish</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onNavigate('tasks');
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1C202B] hover:bg-[#242937] border border-[#D4AF37]/25 text-[#F5F2EB] font-medium text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
            >
              <span>Vazifalar ({pendingTasksCount})</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
            </button>
          </div>
        </div>

        {/* Visual Emblem Showcase */}
        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-[#D4AF37]/20 bg-[#111318] min-h-[220px]">
          <SmartImage
            src={HERO_EMBLEM_IMAGE}
            alt="COIN WORLD 24K oltin tanga emblemasi"
            className="w-full h-full object-cover lg:h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0E] via-[#0A0B0E]/35 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-[#D4AF37] font-medium">Jami ishlab topilgan</p>
              <p className="text-xl font-bold text-[#F5F2EB] font-mono tabular-nums">
                {formatCoins(user.totalEarned)} COIN
              </p>
            </div>
            {user.isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/coin-world-source.zip"
                  download="coin-world-source.zip"
                  className="min-h-[40px] px-3 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E6C252] text-xs font-semibold text-[#0A0B0E] flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ZIP</span>
                </a>
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#0A0B0E]/80 hover:bg-[#161922] border border-[#D4AF37]/30 text-xs font-medium text-[#F5D77F] flex items-center gap-1.5 whitespace-nowrap shrink-0 backdrop-blur-sm transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  <span>Admin panel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick KPI Strip (4 columns on desktop, 2x2 on mobile) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#13151B] border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-[#A39E93]">Kunlik seriya</p>
          <p className="mt-1 text-xl font-bold text-[#F5F2EB] font-mono tabular-nums">
            {user.dailyStreak} / 7 kun
          </p>
        </div>
        <div className="bg-[#13151B] border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-[#A39E93]">Taklif qilingan do‘stlar</p>
          <p className="mt-1 text-xl font-bold text-[#F5F2EB] font-mono tabular-nums">
            {user.referralsCount} / {formatCoins(MAX_REFERRALS_LIMIT)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('leaderboard')}
          className="bg-[#13151B] hover:bg-[#191C25] border border-white/10 rounded-2xl p-4 text-left transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#A39E93] flex items-center justify-between">
            <span>Reyting jadvali</span>
            <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" />
          </p>
          <p className="mt-1 text-xl font-bold text-[#F5D77F]">Top ishtirokchilar</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('auction')}
          className="bg-[#13151B] hover:bg-[#191C25] border border-white/10 rounded-2xl p-4 text-left transition-colors cursor-pointer"
        >
          <p className="text-xs text-[#A39E93]">Faol auksion</p>
          <p className="mt-1 text-xl font-bold text-[#F5F2EB] font-mono tabular-nums truncate">
            {featuredAuction ? `${formatCoins(featuredAuction.currentBid)} COIN` : 'Mavjud'}
          </p>
        </button>
      </section>

      {/* Daily Bonus 7-Day Streak Section */}
      <section className="bg-[#13151B] border border-[#D4AF37]/20 rounded-2xl p-5 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-[#F5F2EB] flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#D4AF37]" />
              <span>Kunlik bonus taqvimi</span>
            </h2>
            <p className="text-sm text-[#A39E93] mt-1">
              Har kuni kirib ketma-ketlikni saqlang va 7-kunda 10 000 COIN yutib oling.
            </p>
          </div>

          <button
            type="button"
            disabled={!canClaimDaily}
            onClick={() => {
              triggerHaptic('success');
              onClaimDaily();
            }}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
              canClaimDaily
                ? 'bg-[#D4AF37] hover:bg-[#E6C252] text-[#0A0B0E] active:scale-[0.98]'
                : 'bg-[#1D202A] text-[#78746C] border border-white/10 cursor-not-allowed'
            }`}
          >
            {canClaimDaily
              ? `${currentDayNumber}-kun bonusini olish`
              : 'Bugungi bonus olindi'}
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
          {dailyDays.map((item) => {
            const isClaimed = item.day <= user.dailyStreak;
            const isTodayTarget = canClaimDaily && item.day === (user.dailyStreak % 7) + 1;

            return (
              <div
                key={item.day}
                className={`rounded-xl p-3 text-center border transition-colors ${
                  isTodayTarget
                    ? 'bg-[#221D10] border-[#D4AF37] text-[#F5D77F]'
                    : isClaimed
                      ? 'bg-[#181B23] border-[#D4AF37]/30 text-[#D4AF37]'
                      : 'bg-[#0F1117] border-white/10 text-[#8C877D]'
                }`}
              >
                <p className="text-xs font-medium">{item.label}</p>
                <p className="mt-1.5 text-sm font-bold font-mono tabular-nums text-[#F5F2EB]">
                  +{formatCoins(item.reward)}
                </p>
                <p className="mt-1 text-[11px]">
                  {isClaimed ? 'Olindi' : isTodayTarget ? 'Tayyor' : 'Kutilmoqda'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Referral System & Leaderboard Preview Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Referral System */}
        <div className="lg:col-span-7 bg-[#13151B] border border-white/10 rounded-2xl p-5 md:p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-[#F5F2EB] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D4AF37]" />
                <span>Referal tizimi</span>
              </h2>
              <p className="text-sm text-[#A39E93] mt-1">
                Har bir haqiqiy taklif qilingan yangi do‘st uchun +{formatCoins(REFERRAL_REWARD_COINS)} COIN beriladi.
                Maksimal {formatCoins(MAX_REFERRALS_LIMIT)} ta do‘st taklif qilish mumkin.
              </p>
            </div>
          </div>

          <div className="bg-[#0D0F14] border border-[#D4AF37]/25 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-[#A39E93]">Shaxsiy referal havolangiz</p>
              <p className="text-sm font-mono text-[#F5D77F] truncate mt-0.5">{referralLink}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1D212C] hover:bg-[#272C3A] text-[#F5F2EB] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-[#D4AF37]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Nusxalandi' : 'Nusxalash'}</span>
              </button>
              <button
                type="button"
                onClick={handleShareTelegram}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E6C252] text-[#0A0B0E] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Ulashish</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#F5F2EB]">
                Taklif qilingan do‘stlar ({user.referralsCount} / {formatCoins(MAX_REFERRALS_LIMIT)})
              </h3>
              {user.referralsCount >= MAX_REFERRALS_LIMIT ? (
                <span className="text-xs font-medium text-[#D4AF37]">
                  Maksimal limit to‘ldi
                </span>
              ) : (
                allowDemoMode && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('success');
                      onSimulateReferralJoin();
                    }}
                    className="text-xs font-medium text-[#D4AF37] hover:text-[#F5D77F] underline underline-offset-4 cursor-pointer py-1"
                  >
                    + Demo do‘st qo‘shish
                  </button>
                )
              )}
            </div>

            <div className="divide-y divide-white/10">
              {referrals.slice(0, 4).map((friend) => (
                <div
                  key={friend.id}
                  className="py-3 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#F5F2EB] truncate">{friend.name}</p>
                    <p className="text-xs text-[#A39E93]">
                      {friend.username} · {friend.level} · {friend.joinedAt}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-[#D4AF37] shrink-0">
                    +{formatCoins(friend.earnedForYou)} COIN
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard Mini Preview */}
        <div className="lg:col-span-5 bg-[#13151B] border border-white/10 rounded-2xl p-5 md:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#F5F2EB] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#D4AF37]" />
                <span>Peshqadamlar</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('leaderboard')}
                className="text-xs font-medium text-[#D4AF37] hover:text-[#F5D77F] flex items-center gap-1 cursor-pointer py-1"
              >
                <span>Barchasi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-white/10">
              {topLeaderboard.slice(0, 5).map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`py-3 flex items-center justify-between gap-3 ${
                    entry.isCurrentUser ? 'text-[#F5D77F]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 text-center font-mono tabular-nums text-sm font-bold ${
                        idx < 3 ? 'text-[#D4AF37]' : 'text-[#8C877D]'
                      }`}
                    >
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#F5F2EB] truncate">
                        {entry.name} {entry.isCurrentUser ? '(Siz)' : ''}
                      </p>
                      <p className="text-xs text-[#A39E93]">
                        {entry.tier} · {entry.referralsCount} referal
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-mono tabular-nums font-semibold text-[#F5D77F] shrink-0">
                    {formatCoins(entry.balance)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('auction')}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1A1D26] hover:bg-[#232734] border border-[#D4AF37]/20 text-sm font-medium text-[#F5F2EB] flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>Jonli auksionda qatnashish</span>
            <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
          </button>
        </div>
      </section>
    </div>
  );
}
