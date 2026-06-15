import { formatDistanceToNow } from 'date-fns';
import styles from './ProductCard.module.css';

function formatPrice(price, currency = 'USD') {
  if (price == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

export default function ProductCard({ product, scraping, onDelete, onScrape, onChart }) {
  const {
    name, url, current_price, previous_price, currency,
    in_stock, last_price_at, last_scraped_at,
  } = product;

  const priceDelta = current_price != null && previous_price != null
    ? current_price - previous_price : null;
  const pctChange = priceDelta != null && previous_price !== 0
    ? (priceDelta / previous_price) * 100 : null;

  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  })();

  const lastSeen = last_scraped_at
    ? formatDistanceToNow(new Date(last_scraped_at + 'Z'), { addSuffix: true })
    : 'never';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <a href={url} target="_blank" rel="noopener noreferrer" className={styles.name}>
            {name}
          </a>
          <span className={styles.domain}>{domain}</span>
        </div>
        <span className={`${styles.stock} ${in_stock ? styles.inStock : styles.outStock}`}>
          {in_stock ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>

      <div className={styles.priceSection}>
        <span className={styles.price}>
          {formatPrice(current_price, currency)}
        </span>
        {priceDelta != null && (
          <span className={`${styles.delta} ${priceDelta < 0 ? styles.drop : styles.rise}`}>
            {priceDelta < 0 ? '▼' : '▲'} {formatPrice(Math.abs(priceDelta), currency)}
            {pctChange != null && ` (${Math.abs(pctChange).toFixed(1)}%)`}
          </span>
        )}
      </div>

      <div className={styles.meta}>Last updated {lastSeen}</div>

      <div className={styles.actions}>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={onChart}
          title="View price history chart"
        >
          📈 History
        </button>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={onScrape}
          disabled={scraping}
          title="Refresh price now"
        >
          {scraping ? '⏳ Scraping…' : '🔄 Refresh'}
        </button>
        <button
          className={`${styles.btn} ${styles.btnDanger}`}
          onClick={() => { if (confirm(`Stop tracking "${name}"?`)) onDelete(); }}
          title="Stop tracking"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
