import { useState, useEffect, useCallback } from 'react';
import { getProducts, getStats, deleteProduct, manualScrape } from './api';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import ProductCard from './components/ProductCard';
import AddProductModal from './components/AddProductModal';
import PriceChartModal from './components/PriceChartModal';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';
import styles from './App.module.css';

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ph_user')); } catch { return null; }
  });
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [chartProduct, setChartProduct] = useState(null);
  const [scrapingId, setScrapingId] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  function handleAuth(authUser) {
    setUser(authUser);
  }

  function handleLogout() {
    localStorage.removeItem('ph_token');
    localStorage.removeItem('ph_user');
    setUser(null);
    setProducts([]);
    setStats(null);
  }

  const fetchAll = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([getProducts(), getStats()]);
      setProducts(p);
      setStats(s);
      setRateLimited(false);
    } catch (e) {
      if (e.response?.status === 429) {
        setRateLimited(true); // show banner, keep existing products visible
      } else {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchAll();
    const id = setInterval(fetchAll, 30_000);
    return () => clearInterval(id);
  }, [user, fetchAll]);

  if (!user) return <LoginPage onAuth={handleAuth} />;

  return (
    <div className={styles.app}>
      <Navbar onAdd={() => setShowAdd(true)} user={user} onLogout={handleLogout} onAdmin={() => setShowAdmin(true)} />
      {rateLimited && (
        <div className={styles.rateBanner}>
          ⏳ Too many requests — your data is safe, please wait a moment and it will refresh automatically.
        </div>
      )}
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
                onDelete={async () => { await deleteProduct(p.id); setProducts(ps => ps.filter(x => x.id !== p.id)); }}
                onScrape={async () => { setScrapingId(p.id); try { await manualScrape(p.id); await fetchAll(); } finally { setScrapingId(null); } }}
                onChart={() => setChartProduct(p)}
              />
            ))}
          </div>
        )}
      </main>

      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); fetchAll(); }} />}
      {chartProduct && <PriceChartModal product={chartProduct} onClose={() => setChartProduct(null)} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
}