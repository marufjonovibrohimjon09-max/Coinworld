import { useState } from 'react';
import { CheckCircle2, Clock, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { TaskCategory, TaskItem } from '../types/coinworld';
import { formatCoins, openExternalTarget, triggerHaptic } from '../lib/telegram';

interface TasksViewProps {
  tasks: TaskItem[];
  onCompleteTask: (taskId: string) => void;
}

const CATEGORY_FILTERS: { id: 'all' | TaskCategory; label: string }[] = [
  { id: 'all', label: 'Barchasi' },
  { id: 'ijtimoiy', label: 'Ijtimoiy' },
  { id: 'kundalik', label: 'Kundalik' },
  { id: 'hamkor', label: 'Hamkor' },
];

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  ijtimoiy: 'Ijtimoiy tarmoq',
  kundalik: 'Kundalik faollik',
  hamkor: 'Hamkor dasturi',
};

export function TasksView({ tasks, onCompleteTask }: TasksViewProps) {
  const [filter, setFilter] = useState<'all' | TaskCategory>('all');
  const [verifyingIds, setVerifyingIds] = useState<Record<string, boolean>>({});
  const [readyToClaimIds, setReadyToClaimIds] = useState<Record<string, boolean>>({});

  const activeTasks = tasks.filter((t) => t.active);
  const filteredTasks =
    filter === 'all' ? activeTasks : activeTasks.filter((t) => t.category === filter);

  const completedCount = activeTasks.filter((t) => t.completed).length;
  const availableRewardSum = activeTasks
    .filter((t) => !t.completed)
    .reduce((sum, item) => sum + item.reward, 0);

  const handleStartTask = (task: TaskItem) => {
    if (task.completed || verifyingIds[task.id]) return;
    triggerHaptic('light');

    if (task.targetUrl) {
      openExternalTarget(task.targetUrl);
    }

    setVerifyingIds((prev) => ({ ...prev, [task.id]: true }));
    setTimeout(() => {
      setVerifyingIds((prev) => ({ ...prev, [task.id]: false }));
      setReadyToClaimIds((prev) => ({ ...prev, [task.id]: true }));
      triggerHaptic('medium');
    }, 900);
  };

  const handleClaimTask = (task: TaskItem) => {
    if (task.completed) return;
    triggerHaptic('success');
    onCompleteTask(task.id);
    setReadyToClaimIds((prev) => ({ ...prev, [task.id]: false }));
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#F5F2EB]">
            Vazifalar orqali COIN ishlang
          </h1>
          <p className="text-sm text-[#A39E93] mt-1">
            Oddiy topshiriqlarni bajaring va tangalarni darhol hisobingizga oling.
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <p className="text-xs text-[#A39E93]">Bajarildi</p>
            <p className="font-mono tabular-nums font-semibold text-[#F5F2EB]">
              {completedCount} / {activeTasks.length}
            </p>
          </div>
          <div className="h-8 w-px bg-white/10" aria-hidden="true" />
          <div>
            <p className="text-xs text-[#A39E93]">Mavjud mukofot</p>
            <p className="font-mono tabular-nums font-semibold text-[#F5D77F]">
              +{formatCoins(availableRewardSum)} COIN
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div
        className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#13151B] border border-white/10 rounded-xl"
        role="tablist"
        aria-label="Vazifa toifalari"
      >
        {CATEGORY_FILTERS.map((cat) => {
          const isSelected = filter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                triggerHaptic('light');
                setFilter(cat.id);
              }}
              className={`min-h-[40px] px-4 py-1.5 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#D4AF37] text-[#0A0B0E] font-semibold'
                  : 'text-[#A39E93] hover:text-[#F5F2EB]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Task Cards Grid */}
      {filteredTasks.length === 0 ? (
        <div className="bg-[#13151B] border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-sm text-[#A39E93]">
            Ushbu toifada hozircha faol vazifalar mavjud emas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const isVerifying = Boolean(verifyingIds[task.id]);
            const isReadyToClaim = Boolean(readyToClaimIds[task.id]);

            return (
              <article
                key={task.id}
                className={`rounded-2xl p-5 border flex flex-col justify-between gap-4 transition-colors ${
                  task.completed
                    ? 'bg-[#101218] border-white/5 opacity-80'
                    : 'bg-[#13151B] border-[#D4AF37]/20 hover:border-[#D4AF37]/40'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#A39E93]">
                    <span>{CATEGORY_LABELS[task.category]}</span>
                    <span className="font-mono tabular-nums font-semibold text-[#F5D77F]">
                      +{formatCoins(task.reward)} COIN
                    </span>
                  </div>

                  <h2 className="text-base font-semibold text-[#F5F2EB] leading-snug">
                    {task.title}
                  </h2>
                  <p className="text-sm text-[#A39E93] leading-relaxed">{task.description}</p>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/10">
                  {task.completed ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-[#9CA3AF]">
                      <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                      <span>Bajarilgan va mukofot berilgan</span>
                    </div>
                  ) : isVerifying ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-[#F5D77F]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Tekshirilmoqda...</span>
                    </div>
                  ) : isReadyToClaim ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-[#F5D77F]">
                      <Sparkles className="w-4 h-4" />
                      <span>Tasdiqlandi! Mukofotni oling</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-[#A39E93]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Darhol hisoblanadi</span>
                    </div>
                  )}

                  {!task.completed && (
                    <div>
                      {isReadyToClaim ? (
                        <button
                          type="button"
                          onClick={() => handleClaimTask(task)}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E6C252] text-[#0A0B0E] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                        >
                          Mukofotni olish
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isVerifying}
                          onClick={() => handleStartTask(task)}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1C202B] hover:bg-[#262C3B] border border-[#D4AF37]/30 text-[#F5D77F] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <span>{task.actionLabel}</span>
                          {task.targetUrl && <ExternalLink className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
