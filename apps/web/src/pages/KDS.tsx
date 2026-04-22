import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KOT } from '@restaurant/types';
import { Bell, Volume2, VolumeX, CheckCircle, Clock, ChefHat, FlameKindling } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

// ─── Audio helpers ────────────────────────────────────────────────────────────

let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioCtx;
}

function playTone(
  freq: number,
  duration: number,
  volume: number,
  delay = 0,
  type: OscillatorType = 'sine'
) {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

function playNewOrderAlert(volume: number) {
  if (volume === 0) return;
  // Three rising tones
  playTone(440, 0.15, volume, 0.0, 'square');
  playTone(550, 0.15, volume, 0.18, 'square');
  playTone(660, 0.3, volume, 0.36, 'square');
}

function playReadyAlert(volume: number) {
  if (volume === 0) return;
  // Soft two-tone confirmation
  playTone(880, 0.2, volume, 0.0);
  playTone(1100, 0.2, volume, 0.25);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getElapsedInfo(createdAt: Date, now: Date) {
  const mins = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
  if (mins < 10) return { label: `${mins}m`, classes: 'bg-green-700 text-green-100' };
  if (mins <= 20) return { label: `${mins}m`, classes: 'bg-yellow-600 text-yellow-100' };
  return { label: `${mins}m`, classes: 'bg-red-700 text-red-100 animate-pulse' };
}

const STATIONS = ['ALL', 'Tandoor', 'Curry', 'Drinks', 'Dessert', 'General'];

const MOCK_KOTS: KOT[] = [
  {
    id: 'k1', restaurantId: 'r1', branchId: 'b1', orderId: 'o1', tableNumber: '12', waiterName: 'Raju',
    status: 'PENDING', createdAt: new Date(Date.now() - 5 * 60000),
    items: [
      { orderItemId: '1', menuItemId: 'm1', categoryId: 'c1', station: 'Tandoor', name: 'Paneer Tikka', quantity: 2, status: 'PENDING', notes: 'Extra spicy' },
      { orderItemId: '2', menuItemId: 'm2', categoryId: 'c2', station: 'Curry', name: 'Dal Makhani', quantity: 1, status: 'PENDING' },
    ],
  },
  {
    id: 'k2', restaurantId: 'r1', branchId: 'b1', orderId: 'o2', tableNumber: '8', waiterName: 'Amit',
    status: 'PREPARING', createdAt: new Date(Date.now() - 14 * 60000),
    isOnlineOrder: true, deliveryPlatform: 'ZOMATO', customerName: 'Ravi',
    items: [
      { orderItemId: '3', menuItemId: 'm3', categoryId: 'c3', station: 'Curry', name: 'Butter Chicken', variantName: 'Full', quantity: 1, status: 'READY', notes: 'No bone' },
      { orderItemId: '4', menuItemId: 'm4', categoryId: 'c1', station: 'Tandoor', name: 'Garlic Naan', quantity: 4, status: 'PREPARING' },
    ],
  },
  {
    id: 'k3', restaurantId: 'r1', branchId: 'b1', orderId: 'o3', tableNumber: '4', waiterName: 'Rahul',
    status: 'PENDING', createdAt: new Date(Date.now() - 22 * 60000),
    isOnlineOrder: true, deliveryPlatform: 'SWIGGY', customerName: 'Neha',
    items: [
      { orderItemId: '5', menuItemId: 'm5', categoryId: 'c4', station: 'Drinks', name: 'Mango Lassi', quantity: 2, status: 'PENDING' },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function KDS() {
  const { subscribe } = useSocket();
  const [kots, setKots] = useState<KOT[]>(MOCK_KOTS);
  const [now, setNow] = useState(new Date());
  const [stationFilter, setStationFilter] = useState('ALL');
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [newOrderFlash, setNewOrderFlash] = useState(false);

  // Tick every 30 s so timers stay fresh
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Unlock audio context on first user click (browser policy)
  useEffect(() => {
    const unlock = () => { getAudioCtx(); };
    window.addEventListener('click', unlock, { once: true });
    return () => window.removeEventListener('click', unlock);
  }, []);

  // ── Socket.io subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    const unsub1 = subscribe('kot_created', (kot: KOT) => {
      setKots(prev => [kot, ...prev]);
      setNewOrderFlash(true);
      setTimeout(() => setNewOrderFlash(false), 800);
      if (!muted) playNewOrderAlert(volume);
    });

    const unsub2 = subscribe('kot_update', ({ kot }: { type: string; kot: KOT }) => {
      setKots(prev => prev.map(k => (k.id === kot.id ? kot : k)));
    });

    return () => { unsub1(); unsub2(); };
  }, [subscribe, muted, volume]);

  // ── Item tap cycles PENDING → PREPARING → READY ──────────────────────────
  const handleItemTap = useCallback((kotId: string, itemId: string, current: string) => {
    const next = current === 'PENDING' ? 'PREPARING' : current === 'PREPARING' ? 'READY' : 'READY';

    setKots(prev =>
      prev.map(k => {
        if (k.id !== kotId) return k;
        const items = k.items.map(i =>
          i.orderItemId === itemId ? { ...i, status: next as any } : i
        );
        const allReady = items.every(i => i.status === 'READY');
        const anyActive = items.some(i => i.status === 'PREPARING' || i.status === 'READY');
        if (allReady && !muted) playReadyAlert(volume);
        return {
          ...k,
          items,
          status: allReady ? 'READY' : anyActive ? 'PREPARING' : k.status,
        };
      })
    );
    // Real app: PATCH /api/kots/:kotId/items/:itemId/status { status: next }
  }, [muted, volume]);

  const handleNotifyWaiter = (kot: KOT) => {
    // Real app: POST /api/kots/:id/notify → fires FCM push
    alert(`🔔 Waiter ${kot.waiterName} notified — Table ${kot.tableNumber} ready!`);
    setKots(prev => prev.filter(k => k.id !== kot.id));
  };

  const handleSimulateKOT = () => {
    const fakeKot: KOT = {
      id: String(Date.now()),
      restaurantId: 'r1',
      branchId: 'b1',
      orderId: 'dummy-order',
      tableNumber: String(Math.floor(Math.random() * 20) + 1),
      waiterName: 'Demo',
      status: 'PENDING',
      createdAt: new Date(),
      isOnlineOrder: true,
      deliveryPlatform: 'ONDC',
      customerName: 'Sanjay',
      items: [
        {
          orderItemId: String(Date.now()),
          menuItemId: 'm9',
          categoryId: 'c1',
          station: 'Tandoor',
          name: 'Chicken Tandoori',
          variantName: 'Full',
          quantity: 1,
          status: 'PENDING',
          notes: 'Less oil',
        },
      ],
    };
    setKots(prev => [fakeKot, ...prev]);
    setNewOrderFlash(true);
    setTimeout(() => setNewOrderFlash(false), 800);
    if (!muted) playNewOrderAlert(volume);
  };

  const COLUMNS: KOT['status'][] = ['PENDING', 'PREPARING', 'READY'];

  return (
    <div
      className={`h-screen w-full flex flex-col transition-colors duration-150 ${newOrderFlash ? 'bg-orange-950' : 'bg-gray-950'
        }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-black border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat size={28} className="text-amber-400" />
          <h1 className="text-amber-400 text-2xl font-black tracking-widest uppercase">
            Kitchen Display
          </h1>
        </div>

        <div className="flex items-center gap-6">
          {/* Station filter */}
          <div className="flex items-center gap-2">
            <FlameKindling size={16} className="text-gray-500" />
            <select
              value={stationFilter}
              onChange={e => setStationFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
            >
              {STATIONS.map(s => (
                <option key={s} value={s}>{s === 'ALL' ? 'All Stations' : s}</option>
              ))}
            </select>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted(m => !m)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
              onChange={e => { setVolume(+e.target.value); setMuted(false); }}
              className="w-24 accent-amber-500 cursor-pointer"
            />
            <button
              onClick={() => !muted && playNewOrderAlert(volume)}
              className="text-xs text-gray-500 hover:text-gray-300 bg-gray-900 px-2 py-1 rounded border border-gray-700"
            >
              Test
            </button>
          </div>

          {/* Demo trigger */}
          <button
            onClick={handleSimulateKOT}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded border border-gray-700 transition-colors"
          >
            + Simulate KOT
          </button>
        </div>
      </div>

      {/* ── Kanban Board ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-4 overflow-x-auto p-4 min-h-0">
        {COLUMNS.map(col => {
          const colKots = kots.filter(k => k.status === col && (
            stationFilter === 'ALL' || k.items.some(i => i.station === stationFilter)
          ));

          return (
            <div key={col} className="flex-1 min-w-[340px] max-w-[480px] flex flex-col rounded-xl border border-gray-800 overflow-hidden bg-gray-900">
              {/* Column Header */}
              <div className={`shrink-0 px-4 py-3 font-bold tracking-widest text-sm uppercase flex items-center justify-between
                ${col === 'PENDING' ? 'bg-red-950   text-red-300   border-b border-red-900' : ''}
                ${col === 'PREPARING' ? 'bg-yellow-950 text-yellow-300 border-b border-yellow-900' : ''}
                ${col === 'READY' ? 'bg-green-950  text-green-300  border-b border-green-900' : ''}
              `}>
                <span>{col}</span>
                <span className="bg-black bg-opacity-40 px-2 py-0.5 rounded text-xs font-mono">
                  {colKots.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {colKots.length === 0 && (
                  <p className="text-center text-gray-700 text-sm pt-8">— empty —</p>
                )}

                {colKots.map(kot => {
                  const timeInfo = getElapsedInfo(kot.createdAt, now);
                  const allReady = kot.status === 'READY';
                  const displayItems =
                    stationFilter === 'ALL'
                      ? kot.items
                      : kot.items.filter(i => i.station === stationFilter);

                  return (
                    <div
                      key={kot.id}
                      className={`rounded-xl border-2 overflow-hidden transition-shadow
                        ${allReady
                          ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.25)]'
                          : col === 'PENDING'
                            ? 'border-red-800'
                            : 'border-yellow-800'
                        }
                      `}
                    >
                      {/* Card Header */}
                      <div className="bg-black bg-opacity-60 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Large Table Number or Online Icon */}
                          <div className={`text-black font-black text-3xl leading-none px-4 py-2 rounded-lg min-w-[64px] text-center
                             ${kot.isOnlineOrder
                              ? (kot.deliveryPlatform === 'ZOMATO' ? 'bg-red-500'
                                : kot.deliveryPlatform === 'SWIGGY' ? 'bg-orange-500'
                                  : kot.deliveryPlatform === 'ONDC' ? 'bg-blue-500' : 'bg-purple-300')
                              : 'bg-white'
                            }`}>
                            {kot.isOnlineOrder ? 'WEB' : kot.tableNumber}
                          </div>
                          <div>
                            <p className="text-gray-300 text-sm font-semibold flex items-center gap-2">
                              {kot.isOnlineOrder ? kot.customerName || 'Online Order' : kot.waiterName}
                              {kot.isOnlineOrder && (
                                <span className={`text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest
                                  ${kot.deliveryPlatform === 'ZOMATO' ? 'bg-red-700'
                                    : kot.deliveryPlatform === 'SWIGGY' ? 'bg-orange-700'
                                      : kot.deliveryPlatform === 'ONDC' ? 'bg-blue-700' : 'bg-purple-600'}
                                `}>
                                  {kot.deliveryPlatform || 'ONLINE'}
                                </span>
                              )}
                            </p>
                            <p className="text-gray-600 text-xs mt-0.5">
                              #{kot.id.slice(-6)}
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${timeInfo.classes}`}>
                          <Clock size={13} />
                          {timeInfo.label}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="px-3 py-2 space-y-1.5 bg-gray-950">
                        {displayItems.map(item => (
                          <button
                            key={item.orderItemId}
                            onClick={() => handleItemTap(kot.id, item.orderItemId, item.status)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border-l-4 flex items-start justify-between gap-3 transition-all active:scale-[0.98]
                              ${item.status === 'PENDING' ? 'bg-gray-900  border-red-500   hover:bg-gray-800' : ''}
                              ${item.status === 'PREPARING' ? 'bg-yellow-950 border-yellow-500 hover:bg-yellow-900' : ''}
                              ${item.status === 'READY' ? 'bg-green-950  border-green-600  opacity-60' : ''}
                            `}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-base leading-snug
                                ${item.status === 'READY' ? 'line-through text-gray-600' : 'text-white'}
                              `}>
                                <span className="text-gray-400 mr-1">{item.quantity}×</span>
                                {item.name}
                                {item.variantName && item.variantName !== 'Regular' && (
                                  <span className="text-gray-400 text-sm font-normal ml-1">
                                    ({item.variantName})
                                  </span>
                                )}
                              </p>
                              {item.notes && (
                                <span className="inline-block mt-1.5 bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide">
                                  ⚠ {item.notes}
                                </span>
                              )}
                            </div>

                            <div className="shrink-0 mt-0.5">
                              {item.status === 'PENDING' && <span className="text-xs text-red-400 font-semibold uppercase">Tap to start</span>}
                              {item.status === 'PREPARING' && <span className="text-xs text-yellow-400 font-bold animate-pulse uppercase">Cooking…</span>}
                              {item.status === 'READY' && <CheckCircle size={18} className="text-green-400" />}
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Notify Waiter CTA */}
                      {allReady && (
                        <button
                          onClick={() => handleNotifyWaiter(kot)}
                          className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black text-lg tracking-wide flex items-center justify-center gap-2 transition-colors"
                        >
                          <Bell size={22} />
                          ORDER READY — NOTIFY WAITER
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
