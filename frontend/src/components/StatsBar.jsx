import styles from './StatsBar.module.css';

export default function StatsBar({ stats }) {
  return (
    <div className={styles.bar}>
      <Stat label="Products Tracked" value={stats.totalProducts} icon="📦" />
      <Stat label="Total Scrapes" value={stats.totalScrapes} icon="🔍" />
      <Stat label="Price Drops Detected" value={stats.priceDrops} icon="📉" />
    </div>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className={styles.stat}>
      <span className={styles.icon}>{icon}</span>
      <div>
        <div className={styles.value}>{value.toLocaleString()}</div>
        <div className={styles.label}>{label}</div>
      </div>
    </div>
  );
}
