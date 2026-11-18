import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Coins, Loader2, X } from 'lucide-react';
import type {
  ActiveTab,
  BotIntegrationConfig,
  BootstrapPayload,
  TaskItem,
} from './types/coinworld';
import { DAILY_BONUS_DAYS, REFERRAL_REWARD_COINS } from './config/catalog';
import { coinWorldApi } from './lib/api';
import { formatCoins, initTelegramMiniApp } from './lib/telegram';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { TasksView } from './components/TasksView';
import { MarketplaceView } from './components/MarketplaceView';
import { AuctionView } from './components/AuctionView';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { AdminView } from './components/AdminView';
import type { AdminSection } from './components/AdminView';

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getInitialRouteFromUrl(): { tab: ActiveTab; adminSection: AdminSection } {
  if (typeof window === 'undefined') {
    return { tab: 'home', adminSection: 'tasks' };
  }
  const hash = window.location.hash.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname.toLowerCase();

  if (
    hash === '#admin-export' ||
    hash === '#export' ||
    path.endsWith('/admin/export') ||
    (params.get('tab') === 'admin' && params.get('section') === 'export')
  ) {
    return { tab: 'admin', adminSection: 'export' };
  }
  if (hash === '#admin' || path.endsWith('/admin') || params.get('tab') === 'admin') {
    return { tab: 'admin', adminSection: 'tasks' };
  }
  return { tab: 'home', adminSection: 'tasks' };
}

export default function App() {
  const initialRoute = getInitialRouteFromUrl();
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialRoute.tab);
  const [adminSection, setAdminSection] = useState<AdminSection>(initialRoute.adminSection);
  const [telegramPlatform, setTelegramPlatform] = useState<string>('Brauzer');
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3400);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    let cancelled = false;
    const tgInfo = initTelegramMiniApp();
    setTelegramPlatform(tgInfo.platform);

    coinWorldApi
      .authenticate(tgInfo.initData, tgInfo.startParam)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setAuthError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Telegram Mini App sessiyasini tasdiqlab bo‘lmadi.';
        setAuthError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const pendingTasksCount = useMemo(
    () => (data ? data.tasks.filter((t) => t.active && !t.completed).length : 0),
    [data]
  );

  const handleNavigate = (tab: ActiveTab) => {
    if (tab === 'admin' && !data?.user.isAdmin) {
      showToast('Admin bo‘limiga kirish huquqi mavjud emas.', true);
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const runMutation = async (
    action: () => Promise<BootstrapPayload>,
    successMsg?: string
  ) => {
    try {
      const updated = await action();
      setData(updated);
      if (successMsg) showToast(successMsg);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Amalni bajarib bo‘lmadi.';
      showToast(message, true);
    }
  };

  const handleClaimDailyBonus = () => {
    const nextStreak = data ? (data.user.dailyStreak >= 7 ? 1 : data.user.dailyStreak + 1) : 1;
    const rewardDay = DAILY_BONUS_DAYS.find((d) => d.day === nextStreak) ?? DAILY_BONUS_DAYS[0];
    void runMutation(
      () => coinWorldApi.claimDailyBonus(),
      `${rewardDay.label} bonusi: +${formatCoins(rewardDay.reward)} COIN qo‘shildi!`
    );
  };

  const handleCompleteTask = (taskId: string) => {
    const target = data?.tasks.find((t) => t.id === taskId);
    void runMutation(
      () => coinWorldApi.completeTask(taskId),
      target
        ? `Vazifa bajarildi: +${formatCoins(target.reward)} COIN!`
        : 'Vazifa bajarildi!'
    );
  };

  const handleSimulateReferralJoin = () => {
    void runMutation(
      () => coinWorldApi.simulateReferralJoin(),
      `Yangi referal do‘st qo‘shildi: +${formatCoins(REFERRAL_REWARD_COINS)} COIN!`
    );
  };

  const handleBuyCoinsDemo = (
    coins: number,
    bonusCoins: number,
    _priceUzs: number,
    method: string
  ) => {
    void runMutation(
      () => coinWorldApi.purchaseCoinsDemo(coins, method),
      `Demo xarid muvaffaqiyatli: +${formatCoins(coins + bonusCoins)} COIN hisobga tushdi!`
    );
  };

  const handleBuyPerk = (perkId: string) => {
    const perk = data?.perks.find((p) => p.id === perkId);
    void runMutation(
      () => coinWorldApi.buyPerk(perkId),
      perk ? `${perk.title} faollashtirildi!` : 'Imtiyoz faollashtirildi!'
    );
  };

  const handlePlaceBid = (auctionId: string, amount: number) => {
    void runMutation(
      () => coinWorldApi.placeAuctionBid(auctionId, amount),
      `Stavka qabul qilindi: ${formatCoins(amount)} COIN!`
    );
  };

  const handleUpdateProfileName = (newName: string) => {
    void runMutation(
      () => coinWorldApi.updateProfileName(newName),
      'Profil ismi yangilandi.'
    );
  };

  // Admin handlers
  const handleAddTask = (task: Omit<TaskItem, 'id' | 'completed'>) => {
    void runMutation(
      () =>
        coinWorldApi.adminAddTask({
          title: task.title,
          description: task.description,
          reward: task.reward,
          category: task.category,
          actionLabel: task.actionLabel,
          targetUrl: task.targetUrl,
        }),
      'Yangi vazifa qo‘shildi.'
    );
  };

  const handleToggleTaskActive = (taskId: string) => {
    void runMutation(() => coinWorldApi.adminToggleTask(taskId));
  };

  const handleDeleteTask = (taskId: string) => {
    void runMutation(() => coinWorldApi.adminDeleteTask(taskId), 'Vazifa o‘chirildi.');
  };

  const handleCreateAuction = (payload: {
    title: string;
    subtitle: string;
    description: string;
    startingPrice: number;
    minStep: number;
    durationHours: number;
  }) => {
    void runMutation(
      () => coinWorldApi.adminCreateAuction(payload),
      'Yangi auksion loti yaratildi!'
    );
  };

  const handleCloseAuction = (auctionId: string) => {
    void runMutation(
      () => coinWorldApi.adminCloseAuction(auctionId),
      'Auksion yakunlandi.'
    );
  };

  const handleAdjustUserBalance = (userId: string, delta: number) => {
    void runMutation(
      () => coinWorldApi.adminAdjustBalance(userId, delta),
      `Balans yangilandi (${delta >= 0 ? '+' : ''}${formatCoins(delta)} COIN).`
    );
  };

  const handleUpdateBotConfig = (config: BotIntegrationConfig) => {
    void runMutation(
      () => coinWorldApi.adminUpdateConfig(config),
      'Telegram Bot sozlamalari saqlandi.'
    );
  };

  const handleResetDemoData = () => {
    void runMutation(
      () => coinWorldApi.adminResetData(),
      'Ma’lumotlar boshlang‘ich holatga qaytarildi.'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] text-[#F5F2EB] flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#161922] border border-[#D4AF37]/30 flex items-center justify-center">
          <Coins className="w-7 h-7 text-[#D4AF37]" />
        </div>
        <div className="flex items-center gap-2 text-sm text-[#A39E93]">
          <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
          <span>COIN WORLD yuklanmoqda...</span>
        </div>
      </div>
    );
  }

  if (authError || !data) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] text-[#F5F2EB] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#13151B] border border-[#D4AF37]/25 rounded-2xl p-6 space-y-4 text-center">
          <AlertTriangle className="w-10 h-10 text-[#D4AF37] mx-auto" />
          <h1 className="font-display text-xl font-bold text-[#F5F2EB]">
            Kirish tasdiqlanmadi
          </h1>
          <p className="text-sm text-[#A39E93] leading-relaxed">
            {authError ||
              'Ilovani Telegram bot orqali Mini App sifatida oching.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#0A0B0E] text-sm font-semibold cursor-pointer"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  const today = getTodayDateString();
  const canClaimDaily = data.user.lastDailyClaimDate !== today;

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B0E] text-[#F5F2EB]">
      <TopBar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        balance={data.user.balance}
        isAdmin={data.user.isAdmin}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-24 md:pb-12">
        {activeTab === 'home' && (
          <HomeView
            user={data.user}
            dailyDays={DAILY_BONUS_DAYS}
            canClaimDaily={canClaimDaily}
            onClaimDaily={handleClaimDailyBonus}
            referrals={data.referrals}
            botUsername={data.botConfig.botUsername}
            onNavigate={handleNavigate}
            topLeaderboard={data.leaderboard}
            featuredAuction={data.auctions.find((a) => a.status === 'active')}
            pendingTasksCount={pendingTasksCount}
            allowDemoMode={data.session.allowDemoMode}
            onSimulateReferralJoin={handleSimulateReferralJoin}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView tasks={data.tasks} onCompleteTask={handleCompleteTask} />
        )}

        {activeTab === 'marketplace' && (
          <MarketplaceView
            balance={data.user.balance}
            perks={data.perks}
            onBuyCoinsDemo={handleBuyCoinsDemo}
            onBuyPerk={handleBuyPerk}
          />
        )}

        {activeTab === 'auction' && (
          <AuctionView
            auctions={data.auctions}
            balance={data.user.balance}
            currentUsername={data.user.username}
            onPlaceBid={handlePlaceBid}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView entries={data.leaderboard} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            user={data.user}
            transactions={data.transactions}
            botConfig={data.botConfig}
            session={data.session}
            telegramPlatform={telegramPlatform}
            onNavigate={handleNavigate}
            onOpenExport={() => {
              setAdminSection('export');
              handleNavigate('admin');
            }}
            onUpdateProfileName={handleUpdateProfileName}
          />
        )}

        {activeTab === 'admin' && data.user.isAdmin && (
          <AdminView
            tasks={data.tasks}
            auctions={data.auctions}
            users={data.leaderboard}
            botConfig={data.botConfig}
            session={data.session}
            totalDemoVolumeCoins={data.totalDemoVolumeCoins}
            onAddTask={handleAddTask}
            onToggleTaskActive={handleToggleTaskActive}
            onDeleteTask={handleDeleteTask}
            onCreateAuction={handleCreateAuction}
            onCloseAuction={handleCloseAuction}
            onAdjustUserBalance={handleAdjustUserBalance}
            onUpdateBotConfig={handleUpdateBotConfig}
            onResetDemoData={handleResetDemoData}
            onNotify={showToast}
            activeSection={adminSection}
            onSectionChange={setAdminSection}
          />
        )}
      </main>

      {/* Quiet Desktop Footer */}
      <footer className="hidden md:block border-t border-white/10 py-6 text-xs text-[#8C877D]">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <p>© 2026 COIN WORLD · Telegram Mini App Ekotizimi</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleNavigate('marketplace')}
              className="hover:text-[#F5D77F] transition-colors cursor-pointer"
            >
              Coin bozori
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('auction')}
              className="hover:text-[#F5D77F] transition-colors cursor-pointer"
            >
              Auksion
            </button>
            {data.user.isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavigate('admin')}
                  className="hover:text-[#F5D77F] transition-colors cursor-pointer"
                >
                  Admin panel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminSection('export');
                    handleNavigate('admin');
                  }}
                  className="hover:text-[#F5D77F] transition-colors cursor-pointer"
                >
                  Eksport (ZIP)
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      <BottomNav activeTab={activeTab} onNavigate={handleNavigate} />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50 rounded-xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3 border ${
            toastMessage.isError
              ? 'bg-[#261414] border-red-500/40'
              : 'bg-[#1A1D26] border-[#D4AF37]/50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toastMessage.isError ? (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />
            )}
            <p className="text-sm font-medium text-[#F5F2EB]">{toastMessage.text}</p>
          </div>
          <button
            type="button"
            aria-label="Xabarni yopish"
            onClick={() => setToastMessage(null)}
            className="text-[#A39E93] hover:text-[#F5F2EB] p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
