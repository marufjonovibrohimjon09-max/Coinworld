import { useEffect, useState } from 'react';
import {
  Archive,
  Bot,
  Check,
  CheckCircle2,
  CheckSquare,
  Coins,
  Copy,
  Download,
  Gavel,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import {
  AuctionItem,
  AuthSessionStatus,
  BotIntegrationConfig,
  ExportManifest,
  LeaderboardEntry,
  TaskCategory,
  TaskItem,
} from '../types/coinworld';
import { coinWorldApi } from '../lib/api';
import { formatCoins, triggerHaptic } from '../lib/telegram';

interface AdminViewProps {
  tasks: TaskItem[];
  auctions: AuctionItem[];
  users: LeaderboardEntry[];
  botConfig: BotIntegrationConfig;
  session: AuthSessionStatus;
  totalDemoVolumeCoins: number;
  onAddTask: (task: Omit<TaskItem, 'id' | 'completed'>) => void;
  onToggleTaskActive: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateAuction: (payload: {
    title: string;
    subtitle: string;
    description: string;
    startingPrice: number;
    minStep: number;
    durationHours: number;
  }) => void;
  onCloseAuction: (auctionId: string) => void;
  onAdjustUserBalance: (userId: string, delta: number) => void;
  onUpdateBotConfig: (config: BotIntegrationConfig) => void;
  onResetDemoData: () => void;
  onNotify?: (text: string, isError?: boolean) => void;
  activeSection?: AdminSection;
  onSectionChange?: (section: AdminSection) => void;
}

export type AdminSection = 'tasks' | 'auctions' | 'users' | 'bot' | 'export';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function AdminView({
  tasks,
  auctions,
  users,
  botConfig,
  session,
  totalDemoVolumeCoins,
  onAddTask,
  onToggleTaskActive,
  onDeleteTask,
  onCreateAuction,
  onCloseAuction,
  onAdjustUserBalance,
  onUpdateBotConfig,
  onResetDemoData,
  onNotify,
  activeSection,
  onSectionChange,
}: AdminViewProps) {
  const [internalSection, setInternalSection] = useState<AdminSection>('tasks');
  const section = activeSection ?? internalSection;
  const setSection = (next: AdminSection) => {
    setInternalSection(next);
    onSectionChange?.(next);
  };

  // New Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskReward, setTaskReward] = useState('1500');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('ijtimoiy');
  const [taskUrl, setTaskUrl] = useState('');

  // New Auction Form
  const [aucTitle, setAucTitle] = useState('');
  const [aucSubtitle, setAucSubtitle] = useState('Maxsus seriya #01/10');
  const [aucPrice, setAucPrice] = useState('25000');
  const [aucStep, setAucStep] = useState('2000');
  const [aucHours, setAucHours] = useState('6');

  // Users Search
  const [userSearch, setUserSearch] = useState('');

  // Bot Config Draft
  const [botDraft, setBotDraft] = useState(botConfig);
  const [botSaved, setBotSaved] = useState(false);

  // Project Export State (preloaded on Admin mount so Download ZIP & file count are ready immediately)
  const [exportManifest, setExportManifest] = useState<ExportManifest | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [copiedCmdId, setCopiedCmdId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setExportLoading(true);
    setExportError(null);

    coinWorldApi
      .adminGetExportManifest()
      .then((manifest) => {
        if (!cancelled) setExportManifest(manifest);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setExportError(
            err instanceof Error ? err.message : 'Eksport ro‘yxatini yuklab bo‘lmadi.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setExportLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownloadZip = async () => {
    if (downloadingZip) return;
    setDownloadingZip(true);
    triggerHaptic('medium');
    try {
      const blob = await coinWorldApi.adminDownloadExportZip();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = exportManifest?.archiveFilename || 'coin-world-source.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      triggerHaptic('success');
      onNotify?.('Loyiha kodi ZIP arxivi yuklab olindi!');
    } catch (err: unknown) {
      triggerHaptic('error');
      onNotify?.(
        err instanceof Error ? err.message : 'ZIP arxivini yuklab olishda xatolik.',
        true
      );
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleCopySnippet = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard fallback
    }
    triggerHaptic('light');
    setCopiedCmdId(id);
    onNotify?.('Buyruq nusxalandi.');
    setTimeout(() => setCopiedCmdId(null), 1800);
  };

  const totalCirculating = users.reduce((sum, u) => sum + u.balance, 0);
  const activeAuctionsCount = auctions.filter((a) => a.status === 'active').length;

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    triggerHaptic('success');
    onAddTask({
      title: taskTitle.trim(),
      description:
        taskDesc.trim() || 'Admin tomonidan qo‘shilgan maxsus topshiriq.',
      reward: Math.max(100, Number(taskReward) || 1000),
      category: taskCategory,
      actionLabel: taskUrl.trim() ? 'O‘tish' : 'Bajarish',
      targetUrl: taskUrl.trim() || undefined,
      active: true,
    });
    setTaskTitle('');
    setTaskDesc('');
    setTaskUrl('');
  };

  const handleCreateAuctionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aucTitle.trim()) return;
    triggerHaptic('success');
    onCreateAuction({
      title: aucTitle.trim(),
      subtitle: aucSubtitle.trim() || 'Yangi lot',
      description: 'Admin panel orqali yaratilgan eksklyuziv lot.',
      startingPrice: Math.max(5000, Number(aucPrice) || 20000),
      minStep: Math.max(500, Number(aucStep) || 1000),
      durationHours: Math.max(1, Number(aucHours) || 6),
    });
    setAucTitle('');
  };

  const handleSaveBotConfig = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');
    onUpdateBotConfig({
      ...botDraft,
      botUsername: botDraft.botUsername.replace(/^@/, '').trim() || 'CoinWorldUzBot',
    });
    setBotSaved(true);
    setTimeout(() => setBotSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#F5F2EB] flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-[#D4AF37]" />
            <span>Admin boshqaruv paneli</span>
          </h1>
          <p className="text-sm text-[#A39E93] mt-1">
            Vazifalar, auksionlar, foydalanuvchi balanslari va Telegram Bot sozlamalarini
            boshqaring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={downloadingZip}
            onClick={handleDownloadZip}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#E5B84B] to-[#C89B2B] hover:from-[#F2CA63] hover:to-[#D4AF37] disabled:opacity-60 text-[#0A0B0E] text-xs md:text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-transform active:scale-[0.98]"
          >
            {downloadingZip ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{downloadingZip ? 'Yuklanmoqda...' : 'Download ZIP'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('warning');
              onResetDemoData();
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1B1E28] hover:bg-[#252A38] border border-white/10 text-xs font-medium text-[#F5F2EB] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#D4AF37]" />
            <span>Demo ma’lumotlarni tiklash</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#13151B] border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-[#A39E93]">Ishtirokchilar</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#F5F2EB]">
            {users.length}
          </p>
        </div>
        <div className="bg-[#13151B] border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-[#A39E93]">Muomaladagi COIN</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#F5D77F]">
            {formatCoins(totalCirculating)}
          </p>
        </div>
        <div className="bg-[#13151B] border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-[#A39E93]">Faol auksionlar</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#F5F2EB]">
            {activeAuctionsCount}
          </p>
        </div>
        <div className="bg-[#13151B] border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-[#A39E93]">Demo bozor aylanmasi</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#D4AF37]">
            {formatCoins(totalDemoVolumeCoins)}
          </p>
        </div>
      </div>

      {/* Always-Visible Project Export Quick Bar */}
      {section !== 'export' && (
        <div className="bg-[#13151B] border border-[#D4AF37]/25 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#221D10] border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#F5F2EB]">
                Loyiha eksporti va Deploy (ZIP)
              </p>
              <p className="text-xs text-[#A39E93] mt-0.5">
                {exportManifest
                  ? `${exportManifest.totalFiles} ta manba fayli (${formatBytes(
                      exportManifest.totalBytes
                    )}) eksport uchun tayyor`
                  : 'To‘liq HTML, CSS, TypeScript, Docker va Telegram Mini App kodi'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSection('export');
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1C202B] hover:bg-[#242937] border border-[#D4AF37]/25 text-xs font-medium text-[#F5F2EB] whitespace-nowrap cursor-pointer"
            >
              Eksport bo‘limini ochish
            </button>
            <button
              type="button"
              disabled={downloadingZip}
              onClick={handleDownloadZip}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E6C252] disabled:opacity-60 text-[#0A0B0E] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingZip ? 'Tayyorlanmoqda...' : 'Download ZIP'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#13151B] border border-white/10 rounded-xl w-full md:w-fit overflow-x-auto">
        {(
          [
            { id: 'tasks', label: 'Vazifalar', icon: CheckSquare },
            { id: 'auctions', label: 'Auksionlar', icon: Gavel },
            { id: 'users', label: 'Foydalanuvchilar', icon: Users },
            { id: 'bot', label: 'Bot va tizim', icon: Bot },
            { id: 'export', label: 'Eksport (ZIP)', icon: Archive },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSection(item.id);
              }}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                active
                  ? 'bg-[#D4AF37] text-[#0A0B0E] font-semibold'
                  : 'text-[#A39E93] hover:text-[#F5F2EB]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section: Tasks Management */}
      {section === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddTaskSubmit}
            className="lg:col-span-5 bg-[#13151B] border border-[#D4AF37]/20 rounded-2xl p-5 space-y-4 h-fit"
          >
            <h2 className="text-base font-semibold text-[#F5F2EB] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Yangi vazifa qo‘shish</span>
            </h2>

            <div>
              <label className="block text-xs text-[#A39E93] mb-1">Sarlavha</label>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Masalan: Telegram botga start bosing"
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#0D0F14] border border-white/15 text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A39E93] mb-1">Tavsif</label>
              <input
                type="text"
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Qisqa tushuntirish"
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#0D0F14] border border-white/15 text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#A39E93] mb-1">Mukofot (COIN)</label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={taskReward}
                  onChange={(e) => setTaskReward(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#0D0F14] border border-white/15 text-sm font-mono tabular-nums text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A39E93] mb-1">Toifa</label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#0D0F14] border border-white/15 text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="ijtimoiy">Ijtimoiy</option>
                  <option value="kundalik">Kundalik</option>
                  <option value="hamkor">Hamkor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#A39E93] mb-1">Havola (ixtiyoriy)</label>
              <input
                type="url"
                value={taskUrl}
                onChange={(e) => setTaskUrl(e.target.value)}
                placeholder="https://t.me/..."
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#0D0F14] border border-white/15 text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-[#D4AF37] hover:bg-[#E6C252] text-[#0A0B0E] text-sm font-semibold cursor-pointer"
            >
              Vazifani e’lon qilish
            </button>
          </form>

          <div className="lg:col-span-7 bg-[#13151B] border border-white/10 rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-[#F5F2EB]">
              Mavjud vazifalar ({tasks.length})
            </h2>
            <div className="divide-y divide-white/10">
              {tasks.map((task) => (
                <div key={task.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F5F2EB] truncate">{task.title}</p>
                    <p className="text-xs text-[#A39E93] font-mono tabular-nums">
                      +{formatCoins(task.reward)} COIN · {task.category} ·{' '}
                      {task.active ? 'Faol' : 'To‘xtatilgan'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleTaskActive(task.id)}
                      className="min-h-[38px] px-3 rounded-lg bg-[#1D202A] hover:bg-[#262B38] text-xs text-[#F5F2EB] cursor-pointer"
                    >
                      {task.active ? 'Nofaol qilish' : 'Faollashtirish'}
                    </button>
                    <button
                      type="button"
                      aria-label="Vazifani o‘chirish"
                      onClick={() => onDeleteTask(task.id)}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-[#2A1717] hover:bg-[#3A2020] text-red-300 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section: Auctions Management */}
      {section === 'auctions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateAuctionSubmit}
            className="lg:col-span-5 bg-[#13151B] border border-[#D4AF37]/20 rounded-2xl p-5 space-y-4 h-fit"
          >
            <h2 className="text-base font-semibold text-[#F5F2EB] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Yangi auksion loti</span>
            </h2>

            <div>
              <label className="block text-xs text-[#A39E93] mb-1">Lot nomi</label>
              <input
                type="text"
                required
                value={aucTitle}
                onChange={(e) => setAucTitle(e.target.value)}
                placeholder="Masalan: Gold Edition NFT Karta"
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#0D0F14] border border-white/15 text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A39E93] mb-1">Seriya nomi</label>
              <input
                type="text"
                value={aucSubtitle}
                onChange={(e) => setAucSubtitle(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#0D0F14] border border-white/15 text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs text-[#A39E93] mb-1">Boshlang‘ich</label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={aucPrice}
                  onChange={(e) => setAucPrice(e.target.value)}
                  className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#0D0F14] border border-white/15 text-sm font-mono tabular-nums text-[#F5F2EB]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A39E93] mb-1">Qadam</label>
                <input
                  type="number"
                  min={500}
                  step={500}
                  value={aucStep}
                  onChange={(e) => setAucStep(e.target.value)}
                  className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#0D0F14] border border-white/15 text-sm font-mono tabular-nums text-[#F5F2EB]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A39E93] mb-1">Soat</label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={aucHours}
                  onChange={(e) => setAucHours(e.target.value)}
                  className="w-full min-h-[42px] px-2.5 rounded-xl bg-[#0D0F14] border border-white/15 text-sm font-mono tabular-nums text-[#F5F2EB]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-[#D4AF37] hover:bg-[#E6C252] text-[#0A0B0E] text-sm font-semibold cursor-pointer"
            >
              Auksionni ishga tushirish
            </button>
          </form>

          <div className="lg:col-span-7 bg-[#13151B] border border-white/10 rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-[#F5F2EB]">
              Auksion lotlari ({auctions.length})
            </h2>
            <div className="divide-y divide-white/10">
              {auctions.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F5F2EB] truncate">{item.title}</p>
                    <p className="text-xs text-[#A39E93] font-mono tabular-nums">
                      Joriy: {formatCoins(item.currentBid)} COIN · {item.bids.length} ta stavka ·{' '}
                      {item.status === 'active' ? 'Faol' : 'Yakunlangan'}
                    </p>
                  </div>
                  {item.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => onCloseAuction(item.id)}
                      className="min-h-[38px] px-3 rounded-lg bg-[#1D202A] hover:bg-[#272C3A] text-xs font-medium text-[#F5D77F] shrink-0 cursor-pointer"
                    >
                      Yakunlash
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section: Users & Balance Control */}
      {section === 'users' && (
        <div className="bg-[#13151B] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#F5F2EB]">
              Foydalanuvchilar balansini boshqarish
            </h2>
            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Ism yoki @username bo‘yicha qidirish..."
              className="min-h-[42px] px-3.5 rounded-xl bg-[#0D0F14] border border-white/15 text-sm text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none sm:w-72"
            />
          </div>

          <div className="divide-y divide-white/10">
            {filteredUsers.map((entry) => (
              <div
                key={entry.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-[#F5F2EB]">
                    {entry.name} {entry.isCurrentUser ? '(Siz)' : ''}
                  </p>
                  <p className="text-xs text-[#A39E93]">
                    {entry.username} · {entry.tier} ·{' '}
                    <span className="font-mono tabular-nums text-[#F5D77F]">
                      {formatCoins(entry.balance)} COIN
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onAdjustUserBalance(entry.id, 5000);
                    }}
                    className="min-h-[38px] px-3 rounded-lg bg-[#221D10] hover:bg-[#2E2715] border border-[#D4AF37]/30 text-xs font-mono tabular-nums text-[#F5D77F] flex items-center gap-1 cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>+5 000</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onAdjustUserBalance(entry.id, -5000);
                    }}
                    className="min-h-[38px] px-3 rounded-lg bg-[#1D202A] hover:bg-[#282D3B] border border-white/10 text-xs font-mono tabular-nums text-[#D9D4C9] cursor-pointer"
                  >
                    -5 000
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section: Bot & Integration Config */}
      {section === 'bot' && (
        <form
          onSubmit={handleSaveBotConfig}
          className="bg-[#13151B] border border-white/10 rounded-2xl p-5 md:p-6 space-y-5 max-w-2xl"
        >
          <div>
            <h2 className="text-base font-semibold text-[#F5F2EB]">
              Telegram Bot integratsiyasi sozlamalari
            </h2>
            <p className="text-xs text-[#A39E93] mt-1">
              Bot tokeni faqat server muhit o‘zgaruvchisida (`TELEGRAM_BOT_TOKEN`) saqlanadi va
              hech qachon frontend kodiga yozilmaydi.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#0D0F14] border border-[#D4AF37]/25 rounded-xl p-3.5">
            <div>
              <p className="text-[#A39E93]">Server Bot Token holati</p>
              <p className="font-mono text-[#F5D77F] font-semibold mt-0.5">
                {session.botConfigured ? 'Ulangan (Server-only)' : 'Kutilmoqda (.env)'}
              </p>
            </div>
            <div>
              <p className="text-[#A39E93]">HMAC-SHA256 tekshiruvi</p>
              <p className="font-mono text-[#F5F2EB] font-semibold mt-0.5">
                {session.authVerified ? 'Faol va tasdiqlangan' : 'Preview / Kutilmoqda'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#A39E93] mb-1">
                Telegram Bot username (@ belgisiz)
              </label>
              <input
                type="text"
                value={botDraft.botUsername}
                onChange={(e) => setBotDraft({ ...botDraft, botUsername: e.target.value })}
                className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#0D0F14] border border-white/15 text-sm font-mono text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A39E93] mb-1">Webhook Endpoint URL</label>
              <input
                type="url"
                value={
                  botDraft.webhookEndpoint ||
                  (typeof window !== 'undefined'
                    ? `${window.location.origin}/api/telegram/webhook`
                    : '')
                }
                onChange={(e) => setBotDraft({ ...botDraft, webhookEndpoint: e.target.value })}
                className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#0D0F14] border border-white/15 text-sm font-mono text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#0D0F14] border border-white/10 rounded-xl p-3.5">
              <div>
                <p className="text-[#A39E93]">Minimal xarid chegarasi</p>
                <p className="font-mono tabular-nums text-[#F5D77F] font-semibold mt-0.5">
                  {formatCoins(botDraft.minPurchaseCoins)} COIN
                </p>
              </div>
              <div>
                <p className="text-[#A39E93]">Maksimal xarid chegarasi</p>
                <p className="font-mono tabular-nums text-[#F5D77F] font-semibold mt-0.5">
                  {formatCoins(botDraft.maxPurchaseCoins)} COIN
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-[#D4AF37] hover:bg-[#E6C252] text-[#0A0B0E] text-sm font-semibold cursor-pointer"
            >
              Sozlamalarni saqlash
            </button>
            {botSaved && (
              <span className="text-xs text-[#D4AF37] font-medium">
                Saqlandi! Referal havolalar yangilandi.
              </span>
            )}
          </div>
        </form>
      )}

      {/* Section: Project Export Hub */}
      {section === 'export' && (
        <div className="space-y-6">
          <div className="bg-[#13151B] border border-[#D4AF37]/25 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <h2 className="text-lg md:text-xl font-semibold text-[#F5F2EB] flex items-center gap-2">
                <Archive className="w-5 h-5 text-[#D4AF37]" />
                <span>Loyiha kodini eksport qilish (ZIP)</span>
              </h2>
              <p className="text-sm text-[#A39E93] max-w-2xl leading-relaxed">
                Barcha HTML, CSS, TypeScript/JavaScript fayllar, rasmlar, Docker va muhit
                shablonlarini o‘z ichiga olgan toza arxivni yuklab oling. Maxfiy `.env` va
                `node_modules` kiritilmaydi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                disabled={downloadingZip}
                onClick={handleDownloadZip}
                className="min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-[#E5B84B] to-[#C89B2B] hover:from-[#F2CA63] hover:to-[#D4AF37] disabled:opacity-60 text-[#0A0B0E] font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-transform active:scale-[0.98]"
              >
                {downloadingZip ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>
                  {downloadingZip ? 'Arxiv tayyorlanmoqda...' : 'ZIP arxivni yuklab olish'}
                </span>
              </button>

              <a
                href="/coin-world-source.zip"
                download="coin-world-source.zip"
                className="min-h-[48px] px-4 py-3 rounded-xl bg-[#1C202B] hover:bg-[#242937] border border-[#D4AF37]/25 text-xs font-medium text-[#F5D77F] flex items-center justify-center whitespace-nowrap shrink-0 transition-colors"
              >
                To‘g‘ridan-to‘g‘ri havola
              </a>
            </div>
          </div>

          {exportLoading ? (
            <div className="bg-[#13151B] border border-white/10 rounded-2xl p-8 flex items-center justify-center gap-2 text-sm text-[#A39E93]">
              <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
              <span>Loyiha tarkibi tekshirilmoqda...</span>
            </div>
          ) : exportError ? (
            <div className="bg-[#261414] border border-red-500/30 rounded-2xl p-5 text-sm text-red-200">
              {exportError}
            </div>
          ) : exportManifest ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Manifest Categories & Exclusions */}
              <div className="lg:col-span-7 bg-[#13151B] border border-white/10 rounded-2xl p-5 md:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#F5F2EB]">
                      Arxiv tarkibi ({exportManifest.archiveFilename})
                    </h3>
                    <p className="text-xs text-[#A39E93] mt-0.5">
                      Jami {exportManifest.totalFiles} ta fayl ·{' '}
                      <span className="font-mono tabular-nums text-[#F5D77F]">
                        {formatBytes(exportManifest.totalBytes)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-white/10">
                  {exportManifest.categories.map((cat) => (
                    <div key={cat.id} className="py-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#F5F2EB]">{cat.label}</p>
                        <span className="text-xs font-mono tabular-nums text-[#F5D77F] shrink-0">
                          {cat.fileCount} ta · {formatBytes(cat.totalBytes)}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-[#8C877D] truncate">
                        {cat.sampleFiles.join(' · ')}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-white/10 text-xs text-[#A39E93]">
                  <span className="text-[#F5F2EB] font-medium">Xavfsizlik uchun chiqarib tashlandi: </span>
                  <span className="font-mono">{exportManifest.excludedPatterns.join(', ')}</span>
                </div>
              </div>

              {/* Readiness & Quick Deploy Snippets */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-[#13151B] border border-white/10 rounded-2xl p-5 space-y-4">
                  <h3 className="text-base font-semibold text-[#F5F2EB]">
                    Tayyorlik tekshiruvi
                  </h3>
                  <div className="divide-y divide-white/10">
                    {exportManifest.readiness.map((check) => (
                      <div key={check.id} className="py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#F5F2EB]">{check.label}</p>
                          <p className="text-xs text-[#A39E93] mt-0.5">{check.detail}</p>
                        </div>
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            check.ready ? 'text-[#D4AF37]' : 'text-[#6B675E]'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#13151B] border border-white/10 rounded-2xl p-5 space-y-3">
                  <h3 className="text-base font-semibold text-[#F5F2EB]">
                    Tezkor Deploy Buyruqlari
                  </h3>
                  {[
                    {
                      id: 'docker',
                      label: 'Docker ishga tushirish',
                      cmd: 'docker build -t coin-world . && docker run -p 3000:3000 --env-file .env coin-world',
                    },
                    {
                      id: 'node',
                      label: 'Node.js 22 ishga tushirish',
                      cmd: 'npm install && npm run build && npm start',
                    },
                    {
                      id: 'webhook',
                      label: 'Telegram Webhook ulash',
                      cmd: `curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -H "Content-Type: application/json" -d '{"url":"${
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/api/telegram/webhook`
                          : 'https://your-domain.uz/api/telegram/webhook'
                      }"}'`,
                    },
                  ].map((snippet) => (
                    <div
                      key={snippet.id}
                      className="bg-[#0D0F14] border border-white/10 rounded-xl p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#A39E93]">
                          {snippet.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopySnippet(snippet.id, snippet.cmd)}
                          className="min-h-[32px] px-2.5 rounded-lg bg-[#1A1E29] hover:bg-[#232836] text-xs text-[#F5D77F] flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCmdId === snippet.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedCmdId === snippet.id ? 'Nusxalandi' : 'Nusxalash'}</span>
                        </button>
                      </div>
                      <p className="text-xs font-mono text-[#D9D4C9] break-all">
                        {snippet.cmd}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
