import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Check,
  Copy,
  Download,
  ShieldCheck,
  Trophy,
  User as UserIcon,
} from 'lucide-react';
import {
  ActiveTab,
  AuthSessionStatus,
  BotIntegrationConfig,
  TransactionRecord,
  UserProfile,
} from '../types/coinworld';
import { formatCoins, triggerHaptic } from '../lib/telegram';
import { SmartImage } from './SmartImage';

interface ProfileViewProps {
  user: UserProfile;
  transactions: TransactionRecord[];
  botConfig: BotIntegrationConfig;
  session: AuthSessionStatus;
  telegramPlatform: string;
  onNavigate: (tab: ActiveTab) => void;
  onOpenExport?: () => void;
  onUpdateProfileName: (newName: string) => void;
}

export function ProfileView({
  user,
  transactions,
  botConfig,
  session,
  telegramPlatform,
  onNavigate,
  onOpenExport,
  onUpdateProfileName,
}: ProfileViewProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.fullName);
  const [copiedId, setCopiedId] = useState(false);

  const initials = user.fullName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSaveName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed.length >= 2) {
      onUpdateProfileName(trimmed);
      triggerHaptic('success');
    }
    setEditingName(false);
  };

  const handleCopyTgId = async () => {
    try {
      await navigator.clipboard.writeText(user.telegramId);
    } catch {
      // Ignore
    }
    triggerHaptic('light');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Profile Identity Card */}
      <section className="bg-[#13151B] border border-[#D4AF37]/25 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {user.photoUrl ? (
            <SmartImage
              src={user.photoUrl}
              alt={user.fullName}
              className="w-16 h-16 rounded-2xl object-cover border border-[#D4AF37]/40 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F5D77F] to-[#A6811A] text-[#0A0B0E] font-display font-bold text-xl flex items-center justify-center shrink-0">
              {initials || <UserIcon className="w-7 h-7" />}
            </div>
          )}

          <div className="min-w-0 space-y-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="min-h-[38px] px-3 rounded-lg bg-[#0D0F14] border border-[#D4AF37]/40 text-sm text-[#F5F2EB] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="min-h-[38px] px-3 rounded-lg bg-[#D4AF37] text-[#0A0B0E] text-xs font-semibold cursor-pointer"
                >
                  Saqlash
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-xl md:text-2xl font-bold text-[#F5F2EB]">
                  {user.fullName}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(user.fullName);
                    setEditingName(true);
                  }}
                  className="text-xs text-[#D4AF37] hover:underline cursor-pointer"
                >
                  Tahrirlash
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-[#A39E93]">
              <span>{user.username}</span>
              <span aria-hidden="true">·</span>
              <span>{user.tier}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleCopyTgId}
                className="inline-flex items-center gap-1 font-mono tabular-nums hover:text-[#F5F2EB] cursor-pointer"
              >
                <span>ID: {user.telegramId}</span>
                {copiedId ? (
                  <Check className="w-3 h-3 text-[#D4AF37]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onNavigate('leaderboard');
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1B1E28] hover:bg-[#232836] border border-white/10 text-sm font-medium text-[#F5F2EB] flex items-center gap-2 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-[#D4AF37]" />
            <span>Reyting</span>
          </button>

          {user.isAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onNavigate('admin');
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E6C252] text-[#0A0B0E] text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin boshqaruvi</span>
              </button>

              {onOpenExport && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onOpenExport();
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1B1E28] hover:bg-[#232836] border border-[#D4AF37]/30 text-sm font-semibold text-[#F5D77F] flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#D4AF37]" />
                  <span>Eksport (ZIP)</span>
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* Wallet Stats & Telegram Mini App Bridge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Transaction History */}
        <section className="lg:col-span-7 bg-[#13151B] border border-white/10 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F5F2EB]">Amallar tarixi</h2>
            <span className="text-xs text-[#A39E93] font-mono tabular-nums">
              {transactions.length} ta yozuv
            </span>
          </div>

          {transactions.length === 0 ? (
            <p className="text-sm text-[#A39E93] py-6 text-center">
              Hozircha tranzaksiyalar mavjud emas.
            </p>
          ) : (
            <div className="divide-y divide-white/10 max-h-[380px] overflow-y-auto pr-1">
              {transactions.map((tx) => {
                const isPositive = tx.amount >= 0;
                return (
                  <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isPositive
                            ? 'bg-[#221D10] text-[#D4AF37]'
                            : 'bg-[#1D202A] text-[#A39E93]'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#F5F2EB] truncate">{tx.title}</p>
                        <p className="text-xs text-[#A39E93]">
                          {tx.timestamp}
                          {tx.note ? ` · ${tx.note}` : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`font-mono tabular-nums text-sm font-semibold shrink-0 ${
                        isPositive ? 'text-[#F5D77F]' : 'text-[#D9D4C9]'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {formatCoins(tx.amount)} COIN
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Telegram Mini App Integration Readiness */}
        <section className="lg:col-span-5 bg-[#13151B] border border-white/10 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-semibold text-[#F5F2EB]">
              Telegram Mini App holati
            </h2>
          </div>

          <p className="text-sm text-[#A39E93] leading-relaxed">
            Ilova Telegram WebApp SDK bilan integratsiya qilingan va kelajakdagi bot backend
            tizimiga ulash uchun tayyorlangan.
          </p>

          <dl className="space-y-3 text-sm border-t border-white/10 pt-4">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[#A39E93]">Muhit</dt>
              <dd className="font-mono text-[#F5F2EB]">
                {session.authMode === 'telegram'
                  ? `Telegram (${telegramPlatform})`
                  : 'Brauzer (Preview)'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[#A39E93]">Autentifikatsiya</dt>
              <dd className="font-mono text-[#F5D77F]">
                {session.authVerified ? 'HMAC-SHA256 tasdiqlangan' : 'Sinov sessiyasi'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[#A39E93]">Bot Token (Server)</dt>
              <dd className="font-mono text-[#F5F2EB]">
                {session.botConfigured ? 'Serverda ulangan' : 'Kutilmoqda (.env)'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[#A39E93]">Bot manzili</dt>
              <dd className="font-mono text-[#F5D77F]">@{botConfig.botUsername}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[#A39E93]">Ro‘yxatdan o‘tgan sana</dt>
              <dd className="font-mono tabular-nums text-[#F5F2EB]">{user.joinedDate}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
