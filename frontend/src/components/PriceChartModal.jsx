import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { getHistory } from '../api';
import styles from './Modal.module.css';

function formatPrice(value, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);
  } catch {
    return `${value}`;
  }
}

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{label}</div>
      <div className={styles.tooltipPrice}>{formatPrice(payload[0].value, currency)}</div>
    </div>
  );
};

export default function PriceChartModal({ product, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(60);

  useEffect(() => {
    getHistory(product.id, range)
      .then(data => setHistory(data.map(d => ({
        ...d,
        date: format(parseISO(d.scraped_at + 'Z'), 'MMM d HH:mm'),
      }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [product.id, range]);

  const prices = history.map(d => d.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const currency = history[0]?.currency || 'USD';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{product.name}</h2>
            <p className={styles.modalSubtitle}>Price history</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.rangeBar}>
          {[20, 60, 100].map(r => (
            <button
              key={r}
              className={`${styles.rangeBtn} ${range === r ? styles.rangeBtnActive : ''}`}
              onClick={() => setRange(r)}
            >
              Last {r}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.chartLoading}>Loading…</div>
        ) : history.length < 2 ? (
          <div className={styles.chartLoading}>
            Not enough data yet — run more scrapes to see a chart.
          </div>
        ) : (
          <>
            <div className={styles.chartStats}>
              <div className={styles.chartStat}>
                <span className={styles.statLabel}>All-time Low</span>
                <span className={`${styles.statValue} ${styles.statGreen}`}>{formatPrice(minPrice, currency)}</span>
              </div>
              <div className={styles.chartStat}>
                <span className={styles.statLabel}>All-time High</span>
                <span className={`${styles.statValue} ${styles.statRed}`}>{formatPrice(maxPrice, currency)}</span>
              </div>
              <div className={styles.chartStat}>
                <span className={styles.statLabel}>Data Points</span>
                <span className={styles.statValue}>{history.length}</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={history} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={v => formatPrice(v, currency)}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <ReferenceLine y={minPrice} stroke="#4ade80" strokeDasharray="4 4" strokeWidth={1} />
                <Area
                  type="monotone" dataKey="price"
                  stroke="#6366f1" strokeWidth={2}
                  fill="url(#priceGrad)"
                  dot={history.length < 20}
                  activeDot={{ r: 5, fill: '#6366f1' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
