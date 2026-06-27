"use client";

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface AssetChartProps {
  symbol: string;
  currentPrice: number;
  livePrices: Record<string, number>;
  onClose?: () => void;
  userPosition?: { shares: number; avgPrice: number } | null;
}

const TIMEFRAMES = [
  { label: 'LIVE', value: 'live', interval: '1m' },
  { label: '1H', value: '1h', interval: '5m' },
  { label: '4H', value: '4h', interval: '15m' },
  { label: '1D', value: '1d', interval: '1h' },
  { label: '1W', value: '1w', interval: '1d' },
  { label: '1M', value: '1M', interval: '1d' },
] as const;

export default function AssetChart({ symbol, currentPrice, livePrices, onClose, userPosition }: AssetChartProps) {
  const [timeframe, setTimeframe] = useState<typeof TIMEFRAMES[number]>(TIMEFRAMES[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);
  const [liveTicks, setLiveTicks] = useState<number[]>([]);

  const fetchHistory = async (tf: typeof timeframe) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/history?symbols=${symbol}&interval=${tf.interval}&limit=${tf.value === 'live' ? 50 : 70}`);
      const data = await res.json();
      let candles: Candle[] = (data[symbol] || []).map((c: any) => ({
        time: c.time * 1000,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })).filter((c: Candle) => c.close > 0);

      if (tf.value === 'live') {
        setChartData(null);
        setLiveTicks(candles.slice(-25).map(c => c.close));
      } else {
        const labels = candles.map(c => format(new Date(c.time), tf.interval.includes('m') || tf.interval.includes('h') ? 'HH:mm' : 'MMM dd'));
        setChartData({
          labels,
          datasets: [{
            label: symbol,
            data: candles.map(c => c.close),
            borderColor: '#EAB308',
            borderWidth: 2,
            tension: 0.15,
            fill: false,
          }],
        });
        setLiveTicks([]);
      }
    } catch (e) {}
    setIsLoading(false);
  };

  // Live tick updates
  useEffect(() => {
    if (timeframe.value !== 'live' || !livePrices[symbol]) return;
    setLiveTicks(prev => [...prev.slice(-39), livePrices[symbol]]);
  }, [livePrices[symbol], timeframe.value]);

  // Build live chart
  useEffect(() => {
    if (timeframe.value !== 'live' || liveTicks.length === 0) return;
    const labels = liveTicks.map((_, i) => format(new Date(Date.now() - (liveTicks.length - i) * 15000), 'HH:mm:ss'));
    setChartData({
      labels,
      datasets: [{
        label: `${symbol} LIVE`,
        data: liveTicks,
        borderColor: '#EAB308',
        borderWidth: 2.5,
        tension: 0.2,
      }],
    });
  }, [liveTicks, timeframe.value, symbol]);

  useEffect(() => {
    fetchHistory(timeframe);
  }, [timeframe, symbol]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { color: '#1F1F1F' }, ticks: { color: '#71717A', maxTicksLimit: 6 } },
      y: { grid: { color: '#1F1F1F' }, ticks: { color: '#A1A1AA' }, position: 'right' as const },
    },
    plugins: { legend: { display: false }, tooltip: { mode: 'index' as const } },
    elements: { point: { radius: 0 } },
  };

  return (
    <div className="bg-card border border-card rounded-2xl p-4 w-full max-w-[520px]">
      <div className="flex justify-between mb-2">
        <div>
          <span className="font-bold text-lg">{symbol}</span> <span className="text-accent font-mono">${currentPrice?.toFixed(currentPrice < 1 ? 4 : 2)}</span>
        </div>
        {onClose && <button onClick={onClose}>✕</button>}
      </div>

      <div className="flex gap-1 mb-3 text-xs">
        {TIMEFRAMES.map(tf => (
          <button key={tf.value} onClick={() => setTimeframe(tf)} className={`px-3 py-0.5 rounded ${timeframe.value === tf.value ? 'bg-accent text-black' : 'bg-surface border border-card'}`}>
            {tf.label}
          </button>
        ))}
      </div>

      <div className="h-72 bg-[#0A0A0A] rounded border border-card p-2">
        {chartData && !isLoading ? <Line data={chartData} options={options} /> : <div className="flex h-full items-center justify-center text-muted">Loading chart...</div>}
      </div>

      {userPosition && (
        <div className="text-xs mt-2 text-muted">
          Your position avg: ${userPosition.avgPrice.toFixed(2)} | Unrealized: <span className={currentPrice > userPosition.avgPrice ? 'text-accent' : 'text-red'}>${((currentPrice - userPosition.avgPrice) * userPosition.shares).toFixed(2)}</span>
        </div>
      )}

      <div className="text-center text-[9px] text-muted mt-1">Real prices • LIVE updates on refresh • Entry marker included</div>
    </div>
  );
}
