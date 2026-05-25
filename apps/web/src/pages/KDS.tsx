import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KOT } from '@restaurant/types';
import { Bell, Volume2, VolumeX, CheckCircle, Clock, ChefHat, FlameKindling, Printer } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useQZTray } from '../hooks/useQZTray';
import { api } from '../utils/api';
import { printKOT, type KOTData } from '../utils/thermalPrint';

import { playReadyAlert } from '../utils/audio';
import { useGlobalSettingsStore } from '../store/globalSettingsStore';
import { useBranchStore } from '../store/branchStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getElapsedInfo(createdAt: Date, now: Date) {
  const mins = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
  if (mins < 10) return { label: `${mins}m`, classes: 'bg-green-700 text-green-100' };
  if (mins <= 20) return { label: `${mins}m`, classes: 'bg-yellow-600 text-yellow-100' };
  return { label: `${mins}m`, classes: 'bg-red-700 text-red-100 animate-pulse' };
}

const STATIONS = ['ALL', 'Tandoor', 'Curry', 'Drinks', 'Dessert', 'General'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function KDS() {
  const { subscribe } = useSocket();
  const { qzConnected, kitchenPrinter } = useQZTray();
  const [kots, setKots] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());
  const [stationFilter, setStationFilter] = useState('ALL');
  const { globalMuted, globalVolume, setGlobalMuted, setGlobalVolume } = useGlobalSettingsStore();
  const [newOrderFlash, setNewOrderFlash] = useState(false);

  // Tick every 30 s so timers stay fresh
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Fetch live KOTs on mount
  useEffect(() => {
    api.get('/kots/active')
      .then(res => {
        // Map string dates to Date objects
        const liveKots = res.data.map((k: any) => ({
          ...k,
          createdAt: new Date(k.createdAt)
        }));
        setKots(liveKots);
      })
      .catch(console.error);
  }, []);

  // ── Socket.io subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    const unsub1 = subscribe('kot_created', (kot: any) => {
      const currentBranchId = useBranchStore.getState().selectedBranchId;
      if (currentBranchId && currentBranchId !== 'all' && kot.branchId !== currentBranchId) return;

      const parsed = { ...kot, createdAt: new Date(kot.createdAt) };
      setKots(prev => [parsed, ...prev]);
      setNewOrderFlash(true);
      setTimeout(() => setNewOrderFlash(false), 800);
      // NOTE: global sound player handles the order sound automatically

      // ── Auto-print KOT slip to kitchen printer via QZ Tray ────────────────
      const printer = kitchenPrinter || localStorage.getItem('qz_kitchen_printer') || '';
      if (printer && qzConnected) {
        const now = new Date();
        const kotData: KOTData = {
          kotNumber: (kot._id || kot.id)?.slice(-6),
          tableNumber: kot.tableNumber || 'Takeaway',
          waiterName: kot.waiterName,
          isOnlineOrder: !!kot.isOnlineOrder,
          deliveryPlatform: kot.deliveryPlatform,
          customerName: kot.customerName,
          items: (kot.items || []).map((i: any) => ({
            name: i.name,
            variantName: i.variantName,
            quantity: i.quantity,
            notes: i.notes,
            station: i.station,
          })),
          time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
        printKOT(kotData, printer).catch(console.warn);
      }
    });

    const unsub2 = subscribe('kot_update', ({ kot }: { type: string; kot: any }) => {
      const currentBranchId = useBranchStore.getState().selectedBranchId;
      if (currentBranchId && currentBranchId !== 'all' && kot.branchId !== currentBranchId) return;
      setKots(prev => prev.map(k => ((k._id || k.id) === (kot._id || kot.id) ? {...kot, createdAt: new Date(kot.createdAt)} : k)));
    });

    return () => { unsub1(); unsub2(); };
  }, [subscribe, kitchenPrinter, qzConnected]);

  // ── Item tap cycles PENDING → PREPARING → READY ──────────────────────────
  const handleItemTap = useCallback(async (kotId: string, itemId: string, current: string) => {
    const next = current === 'PENDING' ? 'PREPARING' : current === 'PREPARING' ? 'READY' : 'READY';

    // Optimistic update
    setKots(prev =>
      prev.map(k => {
        if ((k._id || k.id) !== kotId) return k;
        const items = k.items.map((i: any) =>
          (i._id || i.orderItemId) === itemId ? { ...i, status: next } : i
        );
        const allReady = items.every((i: any) => i.status === 'READY');
        const anyActive = items.some((i: any) => i.status === 'PREPARING' || i.status === 'READY');
        if (allReady && !globalMuted) playReadyAlert(globalVolume);
        return {
          ...k,
          items,
          status: allReady ? 'READY' : anyActive ? 'PREPARING' : k.status,
        };
      })
    );

    try {
      await api.patch(`/kots/${kotId}/items/${itemId}/status`, { status: next });
    } catch (e) {
      console.error('Failed to update item status', e);
    }
  }, [globalMuted, globalVolume]);

  const handleNotifyWaiter = async (kot: any) => {
    try {
      await api.post(`/kots/${kot._id || kot.id}/notify`);
      // Optimistically remove it from UI
      setKots(prev => prev.filter(k => (k._id || k.id) !== (kot._id || kot.id)));
      alert(`🔔 Waiter ${kot.waiterName || 'Staff'} notified — Table ${kot.tableNumber} ready!`);
    } catch (e) {
      console.error('Failed to notify waiter', e);
    }
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
          {/* QZ Tray status indicator */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Printer size={14} className={qzConnected ? 'text-green-400' : 'text-gray-600'} />
            <span className={qzConnected ? 'text-green-400' : 'text-gray-600'}>
              {qzConnected ? 'KOT Print: ON' : 'KOT Print: OFF'}
            </span>
          </div>
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

          {/* Volume controls removed from KDS view as they are now in the global header */}

        </div>
      </div>

      {/* ── Kanban Board ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-4 overflow-x-auto p-4 min-h-0">
        {COLUMNS.map(col => {
          const colKots = kots.filter(k => k.status === col && (
            stationFilter === 'ALL' || k.items.some((i: any) => i.station === stationFilter)
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
                      : kot.items.filter((i: any) => i.station === stationFilter);

                  return (
                    <div
                      key={kot._id || kot.id}
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
                              #{(kot._id || kot.id).slice(-6)}
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
                        {displayItems.map((item: any) => (
                          <button
                            key={item._id || item.orderItemId}
                            onClick={() => handleItemTap(kot._id || kot.id, item._id || item.orderItemId, item.status)}
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
