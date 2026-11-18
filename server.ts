import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import type { Request, Response } from 'express';
import { verifyTelegramInitData } from './server/telegramAuth.ts';
import {
  buildExportManifest,
  buildZipEntriesFromWorkspace,
} from './server/exportManifest.ts';
import { buildZipArchive } from './server/zipExport.ts';
import {
  buildLeaderboard,
  buildUserPerks,
  buildUserTasks,
  createSeedStore,
  loadStore,
  PREVIEW_USER_ID,
  saveStore,
} from './server/store.ts';
import type { StoredUserRecord } from './server/store.ts';
import type {
  AuthSessionStatus,
  BootstrapPayload,
  ReferralFriend,
  TaskCategory,
  TransactionRecord,
} from './src/types/coinworld.ts';

const PORT = Number(process.env.PORT) || 3000;
const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const BOT_USERNAME = (process.env.TELEGRAM_BOT_USERNAME || 'CoinWorldUzBot')
  .replace(/^@/, '')
  .trim();
const APP_URL = (process.env.APP_URL || '').trim();
const WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
const ALLOW_DEMO_MODE = process.env.ALLOW_DEMO_MODE !== 'false';
const ADMIN_IDS = new Set(
  (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

const MIN_COIN_PURCHASE = 5000;
const MAX_COIN_PURCHASE = 160000;
const BASE_RATE_UZS_PER_1000 = 1200;
const REFERRAL_REWARD_COINS = 1000;
const MAX_REFERRALS_LIMIT = 1000;

const DAILY_REWARDS = [500, 1000, 1500, 2500, 4000, 6000, 10000];

const store = loadStore(BOT_USERNAME, APP_URL);

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatNowTimeLabel(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `Bugun, ${h}:${m}`;
}

function calculateMarketPrice(coins: number): { priceUzs: number; bonusCoins: number } {
  const presets: Record<number, { priceUzs: number; bonusCoins: number }> = {
    5000: { priceUzs: 6000, bonusCoins: 0 },
    15000: { priceUzs: 17500, bonusCoins: 750 },
    35000: { priceUzs: 39000, bonusCoins: 2500 },
    75000: { priceUzs: 81000, bonusCoins: 7500 },
    120000: { priceUzs: 126000, bonusCoins: 15000 },
    160000: { priceUzs: 164000, bonusCoins: 24000 },
  };
  if (presets[coins]) return presets[coins];

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

interface ResolvedSession {
  ok: boolean;
  statusCode?: number;
  error?: string;
  userRecord?: StoredUserRecord;
  authMode?: 'telegram' | 'preview';
  authVerified?: boolean;
}

function parseUnverifiedTelegramUser(initData: string): {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  startParam?: string;
} | null {
  try {
    const params = new URLSearchParams(initData);
    const rawUser = params.get('user');
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser) as {
      id?: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
    if (!parsed || typeof parsed.id !== 'number') return null;
    return {
      id: parsed.id,
      first_name: parsed.first_name || 'Foydalanuvchi',
      last_name: parsed.last_name,
      username: parsed.username,
      photo_url: parsed.photo_url,
      startParam: params.get('start_param') || undefined,
    };
  } catch {
    return null;
  }
}

function upsertTelegramUser(
  tgUser: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  },
  startParam?: string
): StoredUserRecord {
  const tgId = String(tgUser.id);
  const fullName =
    [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() ||
    `Foydalanuvchi ${tgId}`;
  const username = tgUser.username ? `@${tgUser.username}` : `@id_${tgId}`;
  const isAdmin =
    ADMIN_IDS.size > 0 ? ADMIN_IDS.has(tgId) : ALLOW_DEMO_MODE;

  let record = store.users[tgId];
  if (!record) {
    const welcomeCoins = 2500;
    const transactions: TransactionRecord[] = [
      {
        id: `tx-welcome-${Date.now()}`,
        type: 'daily_bonus',
        title: 'Xush kelibsiz bonusi',
        amount: welcomeCoins,
        timestamp: formatNowTimeLabel(),
        note: 'Telegram Mini App orqali ro‘yxatdan o‘tish',
      },
    ];

    let initialBalance = welcomeCoins;

    // Handle referral start_param (e.g. ref_849201442) — only for genuinely new users up to 1,000 friends
    if (startParam && startParam.startsWith('ref_')) {
      const referrerTgId = startParam.slice(4).trim();
      const referrer = store.users[referrerTgId];
      if (
        referrer &&
        referrerTgId !== tgId &&
        referrer.profile.referralsCount < MAX_REFERRALS_LIMIT
      ) {
        const refReward = REFERRAL_REWARD_COINS;
        const inviteeBonus = REFERRAL_REWARD_COINS;
        initialBalance += inviteeBonus;
        transactions.unshift({
          id: `tx-ref-join-${Date.now()}`,
          type: 'referral',
          title: `Referal taklif bonusi (${referrer.profile.username})`,
          amount: inviteeBonus,
          timestamp: formatNowTimeLabel(),
        });

        referrer.profile.balance += refReward;
        referrer.profile.totalEarned += refReward;
        referrer.profile.referralsCount += 1;
        referrer.referrals.unshift({
          id: `ref-${Date.now()}`,
          name: fullName,
          username,
          joinedAt: getTodayDateString(),
          earnedForYou: refReward,
          level: 'Bronza',
        });
        referrer.transactions.unshift({
          id: `tx-ref-earn-${Date.now()}`,
          type: 'referral',
          title: `Referal mukofoti · ${username}`,
          amount: refReward,
          timestamp: formatNowTimeLabel(),
          note: 'Yangi do‘st Telegram orqali qo‘shildi',
        });
      }
    }

    record = {
      profile: {
        id: `cw-tg-${tgId}`,
        telegramId: tgId,
        fullName,
        username,
        photoUrl: tgUser.photo_url,
        tier: 'Bronza Hamkor',
        balance: initialBalance,
        totalEarned: initialBalance,
        referralsCount: 0,
        referralCode: `ref_${tgId}`,
        dailyStreak: 0,
        lastDailyClaimDate: null,
        isAdmin,
        joinedDate: getTodayDateString(),
        isTelegramEnvironment: true,
      },
      completedTaskIds: [],
      purchasedPerks: {},
      referrals: [],
      transactions,
    };
    store.users[tgId] = record;
    saveStore(store);
  } else {
    record.profile.fullName = fullName;
    record.profile.username = username;
    if (tgUser.photo_url) {
      record.profile.photoUrl = tgUser.photo_url;
    }
    record.profile.isTelegramEnvironment = true;
    record.profile.isAdmin =
      ADMIN_IDS.size > 0 ? ADMIN_IDS.has(tgId) : record.profile.isAdmin;
    saveStore(store);
  }

  return record;
}

function resolveSession(
  initDataInput: string | undefined,
  startParamInput?: string
): ResolvedSession {
  const initData = (initDataInput || '').trim();

  if (initData) {
    if (BOT_TOKEN) {
      const verified = verifyTelegramInitData(initData, BOT_TOKEN);
      if (!verified.valid || !verified.user) {
        return {
          ok: false,
          statusCode: 401,
          error: 'Telegram initData imzosi tasdiqlanmadi.',
        };
      }
      const userRecord = upsertTelegramUser(
        verified.user,
        verified.startParam || startParamInput
      );
      return {
        ok: true,
        userRecord,
        authMode: 'telegram',
        authVerified: true,
      };
    }

    // Bot token not configured yet — only allow unverified Telegram payload if ALLOW_DEMO_MODE=true
    if (ALLOW_DEMO_MODE) {
      const unverifiedUser = parseUnverifiedTelegramUser(initData);
      if (unverifiedUser) {
        const userRecord = upsertTelegramUser(
          unverifiedUser,
          unverifiedUser.startParam || startParamInput
        );
        return {
          ok: true,
          userRecord,
          authMode: 'telegram',
          authVerified: false,
        };
      }
    }

    return {
      ok: false,
      statusCode: 401,
      error: 'Serverda TELEGRAM_BOT_TOKEN sozlanmagan.',
    };
  }

  // Outside Telegram WebApp (browser preview)
  if (!ALLOW_DEMO_MODE) {
    return {
      ok: false,
      statusCode: 401,
      error: 'Ushbu ilovani faqat Telegram Mini App ichida ochish mumkin.',
    };
  }

  const previewUser = store.users[PREVIEW_USER_ID];
  return {
    ok: true,
    userRecord: previewUser,
    authMode: 'preview',
    authVerified: false,
  };
}

function buildBootstrap(
  record: StoredUserRecord,
  authMode: 'telegram' | 'preview',
  authVerified: boolean
): BootstrapPayload {
  const session: AuthSessionStatus = {
    authMode,
    authVerified,
    botConfigured: Boolean(BOT_TOKEN),
    allowDemoMode: ALLOW_DEMO_MODE,
    appUrl: APP_URL,
  };

  return {
    user: record.profile,
    tasks: buildUserTasks(store.tasks, record.completedTaskIds),
    referrals: record.referrals,
    perks: buildUserPerks(store.perks, record.purchasedPerks),
    auctions: store.auctions,
    leaderboard: buildLeaderboard(store, record.profile.telegramId),
    transactions: record.transactions,
    botConfig: store.botConfig,
    totalDemoVolumeCoins: store.totalDemoVolumeCoins,
    session,
  };
}

function getInitDataFromRequest(req: Request): string {
  const headerVal = req.headers['x-telegram-init-data'];
  if (typeof headerVal === 'string') return headerVal;
  return '';
}

async function sendTelegramBotMessage(
  chatId: number | string,
  text: string,
  webAppUrl?: string
): Promise<void> {
  if (!BOT_TOKEN) return;
  const replyMarkup = webAppUrl
    ? {
        inline_keyboard: [
          [
            {
              text: 'COIN WORLD ilovasini ochish',
              web_app: { url: webAppUrl },
            },
          ],
        ],
      }
    : undefined;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
      }),
    });
  } catch {
    // Non-fatal webhook reply error
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Public health check (never leaks secrets)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'COIN WORLD API',
      botConfigured: Boolean(BOT_TOKEN),
      botUsername: store.botConfig.botUsername,
      allowDemoMode: ALLOW_DEMO_MODE,
      timestamp: new Date().toISOString(),
    });
  });

  // Telegram Mini App Auth & Bootstrap
  app.post('/api/auth/telegram', (req: Request, res: Response) => {
    const body = (req.body || {}) as { initData?: string; startParam?: string };
    const initData = body.initData ?? getInitDataFromRequest(req);
    const resolved = resolveSession(initData, body.startParam);

    if (!resolved.ok || !resolved.userRecord) {
      res.status(resolved.statusCode || 401).json({ error: resolved.error });
      return;
    }

    res.json(
      buildBootstrap(
        resolved.userRecord,
        resolved.authMode || 'preview',
        Boolean(resolved.authVerified)
      )
    );
  });

  // Daily Bonus Claim
  app.post('/api/daily-bonus/claim', (req: Request, res: Response) => {
    const resolved = resolveSession(getInitDataFromRequest(req));
    if (!resolved.ok || !resolved.userRecord) {
      res.status(resolved.statusCode || 401).json({ error: resolved.error });
      return;
    }

    const user = resolved.userRecord;
    const today = getTodayDateString();
    if (user.profile.lastDailyClaimDate === today) {
      res.status(400).json({ error: 'Bugungi kunlik bonus allaqachon olingan.' });
      return;
    }

    const nextStreak = user.profile.dailyStreak >= 7 ? 1 : user.profile.dailyStreak + 1;
    const reward = DAILY_REWARDS[nextStreak - 1] ?? DAILY_REWARDS[0];

    user.profile.balance += reward;
    user.profile.totalEarned += reward;
    user.profile.dailyStreak = nextStreak;
    user.profile.lastDailyClaimDate = today;

    user.transactions.unshift({
      id: `tx-${Date.now()}`,
      type: 'daily_bonus',
      title: `Kunlik bonus · ${nextStreak}-kun`,
      amount: reward,
      timestamp: formatNowTimeLabel(),
    });

    saveStore(store);
    res.json(
      buildBootstrap(user, resolved.authMode || 'preview', Boolean(resolved.authVerified))
    );
  });

  // Complete Task
  app.post('/api/tasks/:id/complete', (req: Request, res: Response) => {
    const resolved = resolveSession(getInitDataFromRequest(req));
    if (!resolved.ok || !resolved.userRecord) {
      res.status(resolved.statusCode || 401).json({ error: resolved.error });
      return;
    }

    const taskId = String(req.params.id);
    const task = store.tasks.find((t) => t.id === taskId && t.active);
    if (!task) {
      res.status(404).json({ error: 'Vazifa topilmadi.' });
      return;
    }

    const user = resolved.userRecord;
    if (user.completedTaskIds.includes(taskId)) {
      res.status(400).json({ error: 'Ushbu vazifa allaqachon bajarilgan.' });
      return;
    }

    user.completedTaskIds.push(taskId);
    user.profile.balance += task.reward;
    user.profile.totalEarned += task.reward;
    user.transactions.unshift({
      id: `tx-${Date.now()}`,
      type: 'task',
      title: `Vazifa: ${task.title}`,
      amount: task.reward,
      timestamp: formatNowTimeLabel(),
    });

    saveStore(store);
    res.json(
      buildBootstrap(user, resolved.authMode || 'preview', Boolean(resolved.authVerified))
    );
  });

  // Marketplace Purchase (Demo mode enforced between 5,000 and 160,000 COIN)
  app.post('/api/marketplace/purchase', (req: Request, res: Response) => {
    const resolved = resolveSession(getInitDataFromRequest(req));
    if (!resolved.ok || !resolved.userRecord) {
      res.status(resolved.statusCode || 401).json({ error: resolved.error });
      return;
    }

    const body = (req.body || {}) as { coins?: number; method?: string };
    const coins = Math.round(Number(body.coins) || 0);
    const method = String(body.method || 'Demo Karta').slice(0, 40);

    if (coins < MIN_COIN_PURCHASE || coins > MAX_COIN_PURCHASE) {
      res.status(400).json({
        error: `Xarid miqdori ${MIN_COIN_PURCHASE} dan ${MAX_COIN_PURCHASE} COIN gacha bo‘lishi shart.`,
      });
      return;
    }

    const { bonusCoins } = calculateMarketPrice(coins);
    const totalAdded = coins + bonusCoins;
    const user = resolved.userRecord;

    user.profile.balance += totalAdded;
    store.totalDemoVolumeCoins += totalAdded;
    user.transactions.unshift({
      id: `tx-${Date.now()}`,
      type: 'purchase',
      title: `Bozordan COIN xaridi (${method})`,
      amount: totalAdded,
      timestamp: formatNowTimeLabel(),
      note: 'Demo to‘lov tasdiqlandi',
    });

    saveStore(store);
    res.json(
      buildBootstrap(user, resolved.authMode || 'preview', Boolean(resolved.authVerified))
    );
  });

  // Marketplace Perk Redemption
  app.post('/api/marketplace/perks/:id/buy', (req: Request, res: Response) => {
    const resolved = resolveSession(getInitDataFromRequest(req));
    if (!resolved.ok || !resolved.userRecord) {
      res.status(resolved.statusCode || 401).json({ error: resolved.error });
      return;
    }

    const perkId = String(req.params.id);
    const perk = store.perks.find((p) => p.id === perkId);
    if (!perk) {
      res.status(404).json({ error: 'Imtiyoz topilmadi.' });
      return;
    }

    const user = resolved.userRecord;
    if (user.profile.balance < perk.costCoins) {
      res.status(400).json({ error: 'Balansingizda yetarli COIN mavjud emas.' });
      return;
    }

    user.profile.balance -= perk.costCoins;
    user.purchasedPerks[perkId] = (user.purchasedPerks[perkId] ?? 0) + 1;
    user.transactions.unshift({
      id: `tx-${Date.now()}`,
      type: 'perk',
      title: `Imtiyoz: ${perk.title}`,
      amount: -perk.costCoins,
      timestamp: formatNowTimeLabel(),
    });

    saveStore(store);
    res.json(
      buildBootstrap(user, resolved.authMode || 'preview', Boolean(resolved.authVerified))
    );
  });

  // Auction Bid
  app.post('/api/auctions/:id/bid', (req: Request, res: Response) => {
    const resolved = resolveSession(getInitDataFromRequest(req));
    if (!resolved.ok || !resolved.userRecord) {
      res.status(resolved.statusCode || 401).json({ error: resolved.error });
      return;
    }

    const auctionId = String(req.params.id);
    const auction = store.auctions.find((a) => a.id === auctionId);
    if (!auction) {
      res.status(404).json({ error: 'Auksion loti topilmadi.' });
      return;
    }

    if (auction.status !== 'active' || auction.endsAt <= Date.now()) {
      res.status(400).json({ error: 'Ushbu auksion yakunlangan.' });
      return;
    }

    const amount = Math.round(Number((req.body as { amount?: number })?.amount) || 0);
    const minRequired = auction.currentBid + auction.minStep;
    if (amount < minRequired) {
      res.status(400).json({ error: `Minimal stavka ${minRequired} COIN.` });
      return;
    }

    const user = resolved.userRecord;
    if (amount > user.profile.balance) {
      res.status(400).json({ error: 'Balansingizda yetarli COIN mavjud emas.' });
      return;
    }

    const nowTime = new Date();
    const hhmm = `${String(nowTime.getHours()).padStart(2, '0')}:${String(
      nowTime.getMinutes()
    ).padStart(2, '0')}`;

    user.profile.balance -= amount;
    auction.currentBid = amount;
    auction.bids.unshift({
      id: `bid-${Date.now()}`,
      bidderName: user.profile.fullName,
      bidderUsername: user.profile.username,
      amount,
      timestamp: hhmm,
      isCurrentUser: true,
    });
    user.transactions.unshift({
      id: `tx-${Date.now()}`,
      type: 'auction_bid',
      title: `Auksion stavkasi · ${auction.title}`,
      amount: -amount,
      timestamp: formatNowTimeLabel(),
    });

    saveStore(store);
    res.json(
      buildBootstrap(user, resolved.authMode || 'preview', Boolean(resolved.authVerified))
    );
  });

  // Update Profile Name
  app.patch('/api/profile', (req: Request, res: Response) => {
    const resolved = resolveSession(getInitDataFromRequest(req));
    if (!resolved.ok || !resolved.userRecord) {
      res.status(resolved.statusCode || 401).json({ error: resolved.error });
      return;
    }

    const fullName = String((req.body as { fullName?: string })?.fullName || '').trim();
    if (fullName.length < 2) {
      res.status(400).json({ error: 'Ism kamida 2 ta belgidan iborat bo‘lishi kerak.' });
      return;
    }

    resolved.userRecord.profile.fullName = fullName.slice(0, 60);
    saveStore(store);
    res.json(
      buildBootstrap(
        resolved.userRecord,
        resolved.authMode || 'preview',
        Boolean(resolved.authVerified)
      )
    );
  });

  // Preview Referral Simulation (only allowed in demo/preview mode)
  app.post('/api/referrals/simulate', (req: Request, res: Response) => {
    if (!ALLOW_DEMO_MODE) {
      res.status(403).json({ error: 'Demo simulyatsiya ishlab chiqarish rejimida o‘chirilgan.' });
      return;
    }

    const resolved = resolveSession(getInitDataFromRequest(req));
    if (!resolved.ok || !resolved.userRecord) {
      res.status(resolved.statusCode || 401).json({ error: resolved.error });
      return;
    }

    const demoNames = [
      { name: 'Bekzod Mahmudov', username: '@bekzod_m' },
      { name: 'Nilufar Karimova', username: '@nilufar_k' },
      { name: 'Otabek Rustamov', username: '@otabek_r' },
      { name: 'Zarina Yusupova', username: '@zarina_y' },
    ];
    const user = resolved.userRecord;
    if (user.profile.referralsCount >= MAX_REFERRALS_LIMIT) {
      res.status(400).json({
        error: `Maksimal ${MAX_REFERRALS_LIMIT} ta do‘st taklif qilish limitiga yetdingiz.`,
      });
      return;
    }
    const picked = demoNames[user.referrals.length % demoNames.length];
    const bonus = REFERRAL_REWARD_COINS;

    const newFriend: ReferralFriend = {
      id: `ref-${Date.now()}`,
      name: picked.name,
      username: picked.username,
      joinedAt: getTodayDateString(),
      earnedForYou: bonus,
      level: 'Bronza',
    };

    user.referrals.unshift(newFriend);
    user.profile.balance += bonus;
    user.profile.totalEarned += bonus;
    user.profile.referralsCount += 1;
    user.transactions.unshift({
      id: `tx-${Date.now()}`,
      type: 'referral',
      title: `Referal mukofoti · ${picked.username}`,
      amount: bonus,
      timestamp: formatNowTimeLabel(),
      note: 'Yangi do‘st qo‘shildi (Demo)',
    });

    saveStore(store);
    res.json(
      buildBootstrap(user, resolved.authMode || 'preview', Boolean(resolved.authVerified))
    );
  });

  // ---------------- ADMIN ROUTES ----------------
  function requireAdmin(req: Request, res: Response): ResolvedSession | null {
    const resolved = resolveSession(getInitDataFromRequest(req));
    if (!resolved.ok || !resolved.userRecord) {
      res.status(resolved.statusCode || 401).json({ error: resolved.error });
      return null;
    }
    if (!resolved.userRecord.profile.isAdmin) {
      res.status(403).json({ error: 'Admin ruxsati talab qilinadi.' });
      return null;
    }
    return resolved;
  }

  app.post('/api/admin/tasks', (req: Request, res: Response) => {
    const resolved = requireAdmin(req, res);
    if (!resolved || !resolved.userRecord) return;

    const body = (req.body || {}) as {
      title?: string;
      description?: string;
      reward?: number;
      category?: TaskCategory;
      actionLabel?: string;
      targetUrl?: string;
    };

    const title = String(body.title || '').trim();
    if (!title) {
      res.status(400).json({ error: 'Vazifa sarlavhasi majburiy.' });
      return;
    }

    store.tasks.unshift({
      id: `task-${Date.now()}`,
      title,
      description:
        String(body.description || '').trim() ||
        'Admin tomonidan qo‘shilgan maxsus topshiriq.',
      reward: Math.max(100, Math.round(Number(body.reward) || 1000)),
      category: body.category || 'ijtimoiy',
      actionLabel: String(body.actionLabel || (body.targetUrl ? 'O‘tish' : 'Bajarish')),
      targetUrl: body.targetUrl ? String(body.targetUrl).trim() : undefined,
      active: true,
    });

    saveStore(store);
    res.json(
      buildBootstrap(
        resolved.userRecord,
        resolved.authMode || 'preview',
        Boolean(resolved.authVerified)
      )
    );
  });

  app.patch('/api/admin/tasks/:id/toggle', (req: Request, res: Response) => {
    const resolved = requireAdmin(req, res);
    if (!resolved || !resolved.userRecord) return;

    const task = store.tasks.find((t) => t.id === req.params.id);
    if (task) {
      task.active = !task.active;
      saveStore(store);
    }
    res.json(
      buildBootstrap(
        resolved.userRecord,
        resolved.authMode || 'preview',
        Boolean(resolved.authVerified)
      )
    );
  });

  app.delete('/api/admin/tasks/:id', (req: Request, res: Response) => {
    const resolved = requireAdmin(req, res);
    if (!resolved || !resolved.userRecord) return;

    store.tasks = store.tasks.filter((t) => t.id !== req.params.id);
    saveStore(store);
    res.json(
      buildBootstrap(
        resolved.userRecord,
        resolved.authMode || 'preview',
        Boolean(resolved.authVerified)
      )
    );
  });

  app.post('/api/admin/auctions', (req: Request, res: Response) => {
    const resolved = requireAdmin(req, res);
    if (!resolved || !resolved.userRecord) return;

    const body = (req.body || {}) as {
      title?: string;
      subtitle?: string;
      description?: string;
      startingPrice?: number;
      minStep?: number;
      durationHours?: number;
    };

    const title = String(body.title || '').trim();
    if (!title) {
      res.status(400).json({ error: 'Auksion nomi majburiy.' });
      return;
    }

    const startPrice = Math.max(1000, Math.round(Number(body.startingPrice) || 20000));
    const hours = Math.max(1, Math.min(72, Math.round(Number(body.durationHours) || 6)));

    store.auctions.unshift({
      id: `auc-${Date.now()}`,
      title,
      subtitle: String(body.subtitle || 'Yangi lot').trim(),
      description:
        String(body.description || '').trim() ||
        'Admin panel orqali yaratilgan eksklyuziv lot.',
      imageUrl: '/src/assets/images/auction_crown_artifact_1794947500304.jpg',
      startingPrice: startPrice,
      currentBid: startPrice,
      minStep: Math.max(500, Math.round(Number(body.minStep) || 1000)),
      endsAt: Date.now() + hours * 3600 * 1000,
      status: 'active',
      bids: [],
    });

    saveStore(store);
    res.json(
      buildBootstrap(
        resolved.userRecord,
        resolved.authMode || 'preview',
        Boolean(resolved.authVerified)
      )
    );
  });

  app.post('/api/admin/auctions/:id/close', (req: Request, res: Response) => {
    const resolved = requireAdmin(req, res);
    if (!resolved || !resolved.userRecord) return;

    const auction = store.auctions.find((a) => a.id === req.params.id);
    if (auction) {
      auction.status = 'ended';
      auction.endsAt = Date.now();
      saveStore(store);
    }

    res.json(
      buildBootstrap(
        resolved.userRecord,
        resolved.authMode || 'preview',
        Boolean(resolved.authVerified)
      )
    );
  });

  app.post('/api/admin/users/:id/adjust-balance', (req: Request, res: Response) => {
    const resolved = requireAdmin(req, res);
    if (!resolved || !resolved.userRecord) return;

    const targetId = String(req.params.id);
    const delta = Math.round(Number((req.body as { delta?: number })?.delta) || 0);

    const realUser = Object.values(store.users).find((u) => u.profile.id === targetId);
    if (realUser) {
      realUser.profile.balance = Math.max(0, realUser.profile.balance + delta);
      realUser.transactions.unshift({
        id: `tx-${Date.now()}`,
        type: 'admin_adjust',
        title: 'Admin balans tuzatishi',
        amount: delta,
        timestamp: formatNowTimeLabel(),
      });
    } else {
      const seededUser = store.seededLeaderboard.find((u) => u.id === targetId);
      if (seededUser) {
        seededUser.balance = Math.max(0, seededUser.balance + delta);
      }
    }

    saveStore(store);
    res.json(
      buildBootstrap(
        resolved.userRecord,
        resolved.authMode || 'preview',
        Boolean(resolved.authVerified)
      )
    );
  });

  app.patch('/api/admin/config', (req: Request, res: Response) => {
    const resolved = requireAdmin(req, res);
    if (!resolved || !resolved.userRecord) return;

    const body = (req.body || {}) as {
      botUsername?: string;
      webhookEndpoint?: string;
    };

    if (body.botUsername) {
      store.botConfig.botUsername = String(body.botUsername)
        .replace(/^@/, '')
        .trim()
        .slice(0, 64);
    }
    if (body.webhookEndpoint) {
      store.botConfig.webhookEndpoint = String(body.webhookEndpoint).trim().slice(0, 200);
    }

    saveStore(store);
    res.json(
      buildBootstrap(
        resolved.userRecord,
        resolved.authMode || 'preview',
        Boolean(resolved.authVerified)
      )
    );
  });

  app.post('/api/admin/reset', (req: Request, res: Response) => {
    const resolved = requireAdmin(req, res);
    if (!resolved || !resolved.userRecord) return;

    const fresh = createSeedStore(BOT_USERNAME, APP_URL);
    store.users = fresh.users;
    store.tasks = fresh.tasks;
    store.perks = fresh.perks;
    store.auctions = fresh.auctions;
    store.seededLeaderboard = fresh.seededLeaderboard;
    store.botConfig = fresh.botConfig;
    store.totalDemoVolumeCoins = fresh.totalDemoVolumeCoins;
    saveStore(store);

    const activeUser = store.users[resolved.userRecord.profile.telegramId] || store.users[PREVIEW_USER_ID];
    res.json(
      buildBootstrap(
        activeUser,
        resolved.authMode || 'preview',
        Boolean(resolved.authVerified)
      )
    );
  });

  // Project Export Hub: Manifest & Downloadable ZIP Archive
  app.get('/api/admin/export-manifest', (req: Request, res: Response) => {
    const resolved = requireAdmin(req, res);
    if (!resolved || !resolved.userRecord) return;

    const manifest = buildExportManifest(Boolean(BOT_TOKEN));
    res.json(manifest);
  });

  app.get('/api/admin/export-zip', (req: Request, res: Response) => {
    const resolved = requireAdmin(req, res);
    if (!resolved || !resolved.userRecord) return;

    const entries = buildZipEntriesFromWorkspace();
    const zipBuffer = buildZipArchive(entries);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="coin-world-source.zip"'
    );
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.send(zipBuffer);
  });

  // Direct ZIP download endpoint (clean source only, zero secrets)
  app.get('/coin-world-source.zip', (_req: Request, res: Response) => {
    const entries = buildZipEntriesFromWorkspace();
    const zipBuffer = buildZipArchive(entries);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="coin-world-source.zip"'
    );
    res.setHeader('Content-Length', String(zipBuffer.length));
    res.send(zipBuffer);
  });

  // Telegram Bot Webhook (handles /start and launches Mini App button)
  app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
    if (WEBHOOK_SECRET) {
      const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];
      if (incomingSecret !== WEBHOOK_SECRET) {
        res.status(403).json({ ok: false });
        return;
      }
    }

    const update = (req.body || {}) as {
      message?: {
        chat?: { id: number };
        text?: string;
        from?: { first_name?: string };
      };
    };

    if (update.message?.chat?.id && update.message.text?.startsWith('/start')) {
      const firstName = update.message.from?.first_name || 'do‘st';
      const parts = update.message.text.split(' ');
      const startParam = parts[1] ? `?startapp=${encodeURIComponent(parts[1])}` : '';
      const launchUrl = APP_URL ? `${APP_URL.replace(/\/$/, '')}${startParam}` : undefined;

      await sendTelegramBotMessage(
        update.message.chat.id,
        `Salom, ${firstName}! COIN WORLD ekotizimiga xush kelibsiz.\n\nVazifalarni bajaring, kunlik bonus oling va auksionda qatnashing.`,
        launchUrl
      );
    }

    res.json({ ok: true });
  });

  // Dev vs Production frontend serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`COIN WORLD server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
