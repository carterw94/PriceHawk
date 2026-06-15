import { useState, useEffect, useCallback } from 'react';
import { getProducts, getStats, deleteProduct, manualScrape } from './api';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import ProductCard from './components/ProductCard';
import AddProductModal from './components/AddProductModal';
import PriceChartModal from './components/PriceChartModal';
import styles from './App.module.css';

export default function App() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [chartProduct, setChartProduct] = useState(null);
  const [scrapingId, setScrapingId] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([getProducts(), getStats()]);
      setProducts(p);
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 30s
    const id = setInterval(fetchAll, 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  async function handleDelete(id) {
    await deleteProduct(id);
    setProducts(p => p.filter(x => x.id !== id));
    setStats(s => s ? { ...s, totalProducts: s.totalProducts - 1 } : s);
  }

  async function handleScrape(id) {
    setScrapingId(id);
    try {
      await manualScrape(id);
      await fetchAll();
    } finally {
      setScrapingId(null);
    }
  }

  return (
    <div className={styles.app}>
      <Navbar onAdd={() => setShowAdd(true)} />

      {stats && <StatsBar stats={stats} />}

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🦅</span>
            <h2>No products tracked yet</h2>
            <p>Add a product URL and price selector to start tracking prices.</p>
            <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
              + Track your first product
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {products.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                scraping={scrapingId === p.id}
                onDelete={() => handleDelete(p.id)}
                onScrape={() => handleScrape(p.id)}
                onChart={() => setChartProduct(p)}
              />
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); fetchAll(); }}
        />
      )}

      {chartProduct && (
        <PriceChartModal
          product={chartProduct}
          onClose={() => setChartProduct(null)}
        />
      )}
    </div>
  );
}
