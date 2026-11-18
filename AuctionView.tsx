import { useEffect, useState } from 'react';
import { Clock, Gavel, History } from 'lucide-react';
import { AuctionItem } from '../types/coinworld';
import { formatCoins, triggerHaptic } from '../lib/telegram';
import { SmartImage } from './SmartImage';

interface AuctionViewProps {
  auctions: AuctionItem[];
  balance: number;
  currentUsername: string;
  onPlaceBid: (auctionId: string, amount: number) => void;
}

function formatCountdown(endsAt: number, now: number): string {
  const diff = Math.max(0, endsAt - now);
  if (diff === 0) return 'Yakunlangan';
  const totalSec = Math.floor(diff / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(
    secs
  ).padStart(2, '0')}`;
}

export function AuctionView({
  auctions,
  balance,
  currentUsername,
  onPlaceBid,
}: AuctionViewProps) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedAuction, setSelectedAuction] = useState<AuctionItem | null>(null);
  const [customBid, setCustomBid] = useState<string>('');
  const [bidError, setBidError] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openBidModal = (item: AuctionItem) => {
    triggerHaptic('light');
    const minNext = item.currentBid + item.minStep;
    setSelectedAuction(item);
    setCustomBid(String(minNext));
    setBidError('');
  };

  const handleSubmitBid = () => {
    if (!selectedAuction) return;
    const bidValue = Number(customBid.replace(/\s+/g, '')) || 0;
    const minRequired = selectedAuction.currentBid + selectedAuction.minStep;

    if (bidValue < minRequired) {
      setBidError(`Minimal stavka ${formatCoins(minRequired)} COIN bo‘lishi kerak.`);
      triggerHaptic('error');
      return;
    }

    if (bidValue > balance) {
      setBidError('Balansingizda yetarli COIN mavjud emas.');
      triggerHaptic('error');
      return;
    }

    triggerHaptic('success');
    onPlaceBid(selectedAuction.id, bidValue);
    setSelectedAuction(null);
  };

  // Sync modal copy if auction state updates while closed
  const activeModalAuction = selectedAuction
    ? auctions.find((a) => a.id === selectedAuction.id) ?? selectedAuction
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#F5F2EB]">
            Jonli Auksion
          </h1>
          <p className="text-sm text-[#A39E93] mt-1">
            Eksklyuziv raqamli kolleksiya buyumlari va VIP a’zolik lotlariga stavka qo‘ying.
          </p>
        </div>

        <div className="text-sm text-[#A39E93]">
          Balansingiz:{' '}
          <span className="font-mono tabular-nums font-bold text-[#F5D77F]">
            {formatCoins(balance)} COIN
          </span>
        </div>
      </div>

      {/* Auction Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {auctions.map((item) => {
          const isEnded = item.status === 'ended' || item.endsAt <= now;
          const topBid = item.bids[0];
          const isLeading = topBid?.bidderUsername === currentUsername;

          return (
            <article
              key={item.id}
              className="bg-[#13151B] border border-[#D4AF37]/20 rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[4/3] bg-[#0B0C10]">
                  <SmartImage
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#13151B] via-transparent to-transparent" />
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#A39E93]">
                    <span>{item.subtitle}</span>
                    <span className="flex items-center gap-1 font-mono tabular-nums text-[#F5D77F]">
                      <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                      {formatCountdown(item.endsAt, now)}
                    </span>
                  </div>

                  <h2 className="text-lg font-semibold text-[#F5F2EB] leading-snug">
                    {item.title}
                  </h2>
                  <p className="text-sm text-[#A39E93] leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 space-y-4">
                <div className="bg-[#0D0F14] border border-white/10 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#A39E93]">
                    <span>Joriy eng yuqori stavka</span>
                    <span>Qadam: +{formatCoins(item.minStep)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xl font-bold font-mono tabular-nums text-[#F5D77F]">
                      {formatCoins(item.currentBid)} COIN
                    </span>
                    <span className="text-xs text-[#B8B0A0] truncate">
                      {topBid
                        ? isLeading
                          ? 'Siz yetakchisiz'
                          : topBid.bidderUsername
                        : 'Stavkalar yo‘q'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isEnded}
                  onClick={() => openBidModal(item)}
                  className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    isEnded
                      ? 'bg-[#1D202A] text-[#78746C] cursor-not-allowed'
                      : 'bg-[#D4AF37] hover:bg-[#E6C252] text-[#0A0B0E]'
                  }`}
                >
                  <Gavel className="w-4 h-4" />
                  <span>{isEnded ? 'Auksion yakunlandi' : 'Stavka qo‘yish'}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Bid Modal / Bottom Sheet */}
      {activeModalAuction && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auction-bid-title"
        >
          <div className="w-full sm:max-w-lg bg-[#151821] border-t sm:border border-[#D4AF37]/30 rounded-t-3xl sm:rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto sm:hidden" />

            <div>
              <p className="text-xs text-[#D4AF37]">{activeModalAuction.subtitle}</p>
              <h3 id="auction-bid-title" className="text-lg font-bold text-[#F5F2EB] mt-0.5">
                {activeModalAuction.title}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#0D0F14] border border-white/10 rounded-xl p-3.5 text-sm">
              <div>
                <p className="text-xs text-[#A39E93]">Joriy stavka</p>
                <p className="font-mono tabular-nums font-bold text-[#F5D77F] mt-0.5">
                  {formatCoins(activeModalAuction.currentBid)} COIN
                </p>
              </div>
              <div>
                <p className="text-xs text-[#A39E93]">Minimal keyingi stavka</p>
                <p className="font-mono tabular-nums font-semibold text-[#F5F2EB] mt-0.5">
                  {formatCoins(activeModalAuction.currentBid + activeModalAuction.minStep)} COIN
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="auction-bid-input"
                className="block text-xs font-medium text-[#A39E93]"
              >
                Sizning stavkangiz (COIN)
              </label>
              <input
                id="auction-bid-input"
                type="text"
                inputMode="numeric"
                value={customBid}
                onChange={(e) => {
                  setBidError('');
                  setCustomBid(e.target.value.replace(/[^\d]/g, ''));
                }}
                className="w-full min-h-[48px] px-4 rounded-xl bg-[#0D0F14] border border-[#D4AF37]/30 focus:border-[#D4AF37] focus:outline-none text-lg font-mono tabular-nums text-[#F5F2EB]"
              />

              <div className="flex flex-wrap gap-2">
                {[1, 2, 5].map((mult) => {
                  const quickAmount =
                    activeModalAuction.currentBid + activeModalAuction.minStep * mult;
                  return (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => {
                        setBidError('');
                        setCustomBid(String(quickAmount));
                      }}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#1E222E] hover:bg-[#282D3C] border border-white/10 text-xs font-mono tabular-nums text-[#F5D77F] cursor-pointer"
                    >
                      {formatCoins(quickAmount)} COIN
                    </button>
                  );
                })}
              </div>

              {bidError && (
                <p role="alert" className="text-xs text-red-400">
                  {bidError}
                </p>
              )}
            </div>

            {/* Recent Bids History */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <p className="text-xs font-medium text-[#A39E93] flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>So‘nggi stavkalar tarixi</span>
              </p>
              <div className="divide-y divide-white/10 max-h-36 overflow-y-auto">
                {activeModalAuction.bids.map((b) => (
                  <div key={b.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#F5F2EB] font-medium">{b.bidderName}</span>
                      <span className="text-[#8C877D] ml-1.5">{b.bidderUsername}</span>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <span className="text-[#F5D77F] font-semibold">
                        {formatCoins(b.amount)}
                      </span>
                      <span className="text-[#8C877D] ml-2">{b.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedAuction(null)}
                className="flex-1 min-h-[44px] rounded-xl bg-[#1F2430] hover:bg-[#292F3E] text-[#F5F2EB] text-sm font-medium cursor-pointer"
              >
                Yopish
              </button>
              <button
                type="button"
                onClick={handleSubmitBid}
                className="flex-1 min-h-[44px] rounded-xl bg-[#D4AF37] hover:bg-[#E6C252] text-[#0A0B0E] text-sm font-semibold cursor-pointer"
              >
                Stavkani tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
