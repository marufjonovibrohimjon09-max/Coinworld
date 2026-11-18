import { useMemo, useState } from 'react';
import { AlertCircle, Check, Coins, ShoppingBag, Sparkles } from 'lucide-react';
import {
  BASE_RATE_UZS_PER_1000,
  COIN_PACKAGES,
  MAX_COIN_PURCHASE,
  MIN_COIN_PURCHASE,
} from '../config/catalog';
import { CoinPackage, MarketplacePerk } from '../types/coinworld';
import { formatCoins, formatUzs, triggerHaptic } from '../lib/telegram';

interface MarketplaceViewProps {
  balance: number;
  perks: MarketplacePerk[];
  onBuyCoinsDemo: (coins: number, bonusCoins: number, priceUzs: number, method: string) => void;
  onBuyPerk: (perkId: string) => void;
}

type PaymentMethod = 'Demo Karta' | 'Click (Demo)' | 'Payme (Demo)' | 'Telegram Stars (Demo)';

const PAYMENT_METHODS: PaymentMethod[] = [
  'Demo Karta',
  'Click (Demo)',
  'Payme (Demo)',
  'Telegram Stars (Demo)',
];

function calculatePackagePrice(coins: number): { priceUzs: number; bonusCoins: number } {
  // Volume discount tiers between 5,000 and 160,000
  let discount = 0;
  let bonusRate = 0;
  if (coins >= 120000) {
    discount = 0.14;
    bonusRate = 0.15;
  } else if (coins >= 75000) {
    discount = 0.1;
    bonusRate = 0.1;
  } else if (coins >= 35000) {
    discount = 0.07;
    bonusRate = 0.07;
  } else if (coins >= 15000) {
    discount = 0.03;
    bonusRate = 0.05;
  }

  const rawPrice = (coins / 1000) * BASE_RATE_UZS_PER_1000;
  const priceUzs = Math.round((rawPrice * (1 - discount)) / 500) * 500;
  const bonusCoins = Math.round((coins * bonusRate) / 50) * 50;
  return { priceUzs, bonusCoins };
}

export function MarketplaceView({
  balance,
  perks,
  onBuyCoinsDemo,
  onBuyPerk,
}: MarketplaceViewProps) {
  const [marketTab, setMarketTab] = useState<'buy' | 'perks'>('buy');
  const [customCoinsInput, setCustomCoinsInput] = useState<string>('35000');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('pkg-35k');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Demo Karta');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const numericCoins = Number(customCoinsInput.replace(/\s+/g, '')) || 0;
  const isAmountValid =
    numericCoins >= MIN_COIN_PURCHASE && numericCoins <= MAX_COIN_PURCHASE;

  const activePricing = useMemo(() => {
    const matchedPkg = COIN_PACKAGES.find((p) => p.coins === numericCoins);
    if (matchedPkg) {
      return {
        priceUzs: matchedPkg.priceUzs,
        bonusCoins: matchedPkg.bonusCoins,
      };
    }
    return calculatePackagePrice(
      Math.min(MAX_COIN_PURCHASE, Math.max(MIN_COIN_PURCHASE, numericCoins || MIN_COIN_PURCHASE))
    );
  }, [numericCoins]);

  const handleSelectPackage = (pkg: CoinPackage) => {
    triggerHaptic('light');
    setSelectedPackageId(pkg.id);
    setCustomCoinsInput(String(pkg.coins));
  };

  const handleSliderChange = (value: number) => {
    setSelectedPackageId('');
    setCustomCoinsInput(String(value));
  };

  const handleInputChange = (val: string) => {
    const digitsOnly = val.replace(/[^\d]/g, '');
    setSelectedPackageId('');
    setCustomCoinsInput(digitsOnly);
  };

  const handleConfirmDemoPurchase = () => {
    if (!isAmountValid) return;
    triggerHaptic('success');
    onBuyCoinsDemo(
      numericCoins,
      activePricing.bonusCoins,
      activePricing.priceUzs,
      paymentMethod
    );
    setConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#F5F2EB]">
            Coin bozori
          </h1>
          <p className="text-sm text-[#A39E93] mt-1">
            Balansni to‘ldiring (5 000 dan 160 000 COIN gacha) yoki tangalaringizni maxsus
            imtiyozlarga almashtiring.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#13151B] border border-[#D4AF37]/25 rounded-xl px-4 py-2.5">
          <Coins className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-xs text-[#A39E93]">Balans:</span>
          <span className="font-mono tabular-nums font-bold text-[#F5D77F]">
            {formatCoins(balance)} COIN
          </span>
        </div>
      </div>

      {/* Mode Segmented Control */}
      <div className="inline-flex items-center gap-1 p-1 bg-[#13151B] border border-white/10 rounded-xl">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setMarketTab('buy');
          }}
          className={`min-h-[42px] px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            marketTab === 'buy'
              ? 'bg-[#D4AF37] text-[#0A0B0E] font-semibold'
              : 'text-[#A39E93] hover:text-[#F5F2EB]'
          }`}
        >
          COIN sotib olish
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setMarketTab('perks');
          }}
          className={`min-h-[42px] px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            marketTab === 'perks'
              ? 'bg-[#D4AF37] text-[#0A0B0E] font-semibold'
              : 'text-[#A39E93] hover:text-[#F5F2EB]'
          }`}
        >
          Imtiyozlar do‘koni
        </button>
      </div>

      {marketTab === 'buy' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Packages & Custom Range Selector */}
          <div className="lg:col-span-7 space-y-6">
            {/* Preset Packages */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {COIN_PACKAGES.map((pkg) => {
                const isSelected =
                  selectedPackageId === pkg.id || numericCoins === pkg.coins;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => handleSelectPackage(pkg)}
                    className={`rounded-2xl p-4 text-left border transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-[#221D10] border-[#D4AF37]'
                        : 'bg-[#13151B] border-white/10 hover:border-[#D4AF37]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-[#A39E93]">
                      <span>{pkg.label}</span>
                      {pkg.bonusCoins > 0 && (
                        <span className="text-[#D4AF37] font-mono tabular-nums">
                          +{formatCoins(pkg.bonusCoins)}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-lg font-bold font-mono tabular-nums text-[#F5F2EB]">
                      {formatCoins(pkg.coins)}
                    </p>
                    <p className="text-xs text-[#F5D77F] font-mono tabular-nums mt-0.5">
                      {formatUzs(pkg.priceUzs)}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom Calculator with Strict Min 5,000 / Max 160,000 */}
            <div className="bg-[#13151B] border border-[#D4AF37]/20 rounded-2xl p-5 md:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-[#F5F2EB]">
                    Ixtiyoriy miqdorni tanlang
                  </h2>
                  <p className="text-xs text-[#A39E93] mt-0.5">
                    Minimal xarid: 5 000 COIN · Maksimal xarid: 160 000 COIN
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-[#D4AF37]">
                  5 000 – 160 000 COIN
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="custom-coin-input"
                    className="block text-xs font-medium text-[#A39E93] mb-1.5"
                  >
                    Tangalar miqdori (COIN)
                  </label>
                  <input
                    id="custom-coin-input"
                    type="text"
                    inputMode="numeric"
                    value={customCoinsInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Masalan: 35000"
                    className="w-full min-h-[48px] px-4 rounded-xl bg-[#0D0F14] border border-[#D4AF37]/30 focus:border-[#D4AF37] focus:outline-none text-lg font-mono tabular-nums text-[#F5F2EB]"
                  />
                </div>

                <div>
                  <input
                    type="range"
                    aria-label="COIN miqdori slayderi"
                    min={MIN_COIN_PURCHASE}
                    max={MAX_COIN_PURCHASE}
                    step={1000}
                    value={
                      Math.min(
                        MAX_COIN_PURCHASE,
                        Math.max(MIN_COIN_PURCHASE, numericCoins || MIN_COIN_PURCHASE)
                      )
                    }
                    onChange={(e) => handleSliderChange(Number(e.target.value))}
                    className="w-full gold-slider"
                  />
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[#8C877D] mt-2">
                    <span>5 000 COIN</span>
                    <span>80 000 COIN</span>
                    <span>160 000 COIN</span>
                  </div>
                </div>

                {!isAmountValid && (
                  <div
                    role="alert"
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#2A1717] border border-red-500/30 text-xs text-red-200"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>
                        {numericCoins < MIN_COIN_PURCHASE
                          ? `Minimal xarid miqdori ${formatCoins(MIN_COIN_PURCHASE)} COIN bo‘lishi kerak.`
                          : `Maksimal xarid miqdori ${formatCoins(MAX_COIN_PURCHASE)} COIN dan oshmasligi kerak.`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomCoinsInput(
                          String(
                            numericCoins < MIN_COIN_PURCHASE
                              ? MIN_COIN_PURCHASE
                              : MAX_COIN_PURCHASE
                          )
                        )
                      }
                      className="font-semibold text-[#F5D77F] underline whitespace-nowrap cursor-pointer"
                    >
                      To‘g‘rilash
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Checkout Summary Card (Demo Mode) */}
          <div className="lg:col-span-5 bg-[#13151B] border border-[#D4AF37]/25 rounded-2xl p-5 md:p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#F5F2EB]">Buyurtma tafsiloti</h2>
              <p className="text-xs text-[#A39E93] mt-1">
                Demo rejim: haqiqiy to‘lov tizimi ulanmagan, tangalar sinov tariqasida qo‘shiladi.
              </p>
            </div>

            <div className="space-y-3 text-sm border-y border-white/10 py-4">
              <div className="flex items-center justify-between">
                <span className="text-[#A39E93]">Asosiy miqdor</span>
                <span className="font-mono tabular-nums font-medium text-[#F5F2EB]">
                  {formatCoins(isAmountValid ? numericCoins : 0)} COIN
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A39E93]">Paket bonusi</span>
                <span className="font-mono tabular-nums font-medium text-[#D4AF37]">
                  +{formatCoins(isAmountValid ? activePricing.bonusCoins : 0)} COIN
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="font-semibold text-[#F5F2EB]">Jami hisoblanadi</span>
                <span className="font-mono tabular-nums font-bold text-[#F5D77F]">
                  {formatCoins(
                    isAmountValid ? numericCoins + activePricing.bonusCoins : 0
                  )}{' '}
                  COIN
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A39E93]">Taxminiy qiymat</span>
                <span className="font-mono tabular-nums font-semibold text-[#F5F2EB]">
                  {isAmountValid ? formatUzs(activePricing.priceUzs) : '—'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#A39E93]">To‘lov usuli (Demo)</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setPaymentMethod(method);
                    }}
                    className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-medium border text-left transition-colors cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-[#221D10] border-[#D4AF37] text-[#F5D77F]'
                        : 'bg-[#0D0F14] border-white/10 text-[#A39E93] hover:text-[#F5F2EB]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!isAmountValid}
              onClick={() => {
                triggerHaptic('medium');
                setConfirmOpen(true);
              }}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-[#E5B84B] to-[#C89B2B] hover:from-[#F2CA63] hover:to-[#D4AF37] disabled:opacity-40 disabled:cursor-not-allowed text-[#0A0B0E] font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Demo xaridni rasmiylashtirish</span>
            </button>
          </div>
        </div>
      ) : (
        /* Perks & Digital Rewards Store */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {perks.map((perk) => {
            const canAfford = balance >= perk.costCoins;
            return (
              <article
                key={perk.id}
                className="bg-[#13151B] border border-[#D4AF37]/20 rounded-2xl p-5 flex flex-col justify-between gap-5"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#A39E93]">
                    <span>Muddati: {perk.durationLabel}</span>
                    {perk.purchasedCount > 0 && (
                      <span className="text-[#D4AF37] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Faol ({perk.purchasedCount})
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-[#F5F2EB] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>{perk.title}</span>
                  </h3>
                  <p className="text-sm text-[#A39E93] leading-relaxed">{perk.description}</p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <span className="font-mono tabular-nums font-bold text-[#F5D77F]">
                    {formatCoins(perk.costCoins)} COIN
                  </span>
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => {
                      triggerHaptic('success');
                      onBuyPerk(perk.id);
                    }}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      canAfford
                        ? 'bg-[#D4AF37] hover:bg-[#E6C252] text-[#0A0B0E]'
                        : 'bg-[#1D202A] text-[#78746C] cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'Faollashtirish' : 'COIN yetarli emas'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Demo Purchase Confirmation Modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-checkout-title"
        >
          <div className="w-full sm:max-w-md bg-[#151821] border-t sm:border border-[#D4AF37]/30 rounded-t-3xl sm:rounded-2xl p-6 space-y-5">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto sm:hidden" />
            <div>
              <h3 id="demo-checkout-title" className="text-lg font-bold text-[#F5F2EB]">
                Demo xaridni tasdiqlash
              </h3>
              <p className="text-sm text-[#A39E93] mt-1">
                Tanlangan usul: <span className="text-[#F5F2EB]">{paymentMethod}</span>. Haqiqiy
                pul yechilmaydi.
              </p>
            </div>

            <div className="bg-[#0D0F14] border border-white/10 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#A39E93]">Xarid miqdori</span>
                <span className="font-mono tabular-nums text-[#F5F2EB]">
                  {formatCoins(numericCoins)} COIN
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A39E93]">Bonus</span>
                <span className="font-mono tabular-nums text-[#D4AF37]">
                  +{formatCoins(activePricing.bonusCoins)} COIN
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10 font-semibold">
                <span className="text-[#F5F2EB]">Jami qo‘shiladi</span>
                <span className="font-mono tabular-nums text-[#F5D77F]">
                  +{formatCoins(numericCoins + activePricing.bonusCoins)} COIN
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-[#1F2430] hover:bg-[#292F3E] text-[#F5F2EB] text-sm font-medium cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleConfirmDemoPurchase}
                className="flex-1 min-h-[44px] rounded-xl bg-[#D4AF37] hover:bg-[#E6C252] text-[#0A0B0E] text-sm font-semibold cursor-pointer"
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
