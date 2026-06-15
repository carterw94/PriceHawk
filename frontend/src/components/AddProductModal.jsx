import { useState } from 'react';
import { addProduct } from '../api';
import styles from './Modal.module.css';

const PRESETS = [
  {
    label: 'Books to Scrape (demo)',
    url: 'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
    selector_price: '.price_color',
    selector_title: '.product_main h1',
  },
  {
    label: 'Amazon (generic)',
    url: '',
    selector_price: '.a-price .a-offscreen',
    selector_title: '#productTitle',
  },
  {
    label: 'eBay (generic)',
    url: '',
    selector_price: '.x-price-primary span[itemprop="price"]',
    selector_title: '.x-item-title__mainTitle span',
  },
];

export default function AddProductModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    name: '',
    url: '',
    selector_price: '',
    selector_title: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function applyPreset(preset) {
    setForm(f => ({
      ...f,
      url: preset.url || f.url,
      selector_price: preset.selector_price,
      selector_title: preset.selector_title,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.url || !form.selector_price) {
      setError('URL and price selector are required.');
      return;
    }
    setLoading(true);
    try {
      await addProduct(form);
      onAdded();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Track a Product</h2>
            <p className={styles.modalSubtitle}>Enter the URL and CSS selectors for the price element</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.presets}>
          <span className={styles.presetsLabel}>Quick fill:</span>
          {PRESETS.map(p => (
            <button key={p.label} className={styles.presetBtn} type="button" onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Field
            label="Product URL *"
            type="url"
            placeholder="https://example.com/product/123"
            value={form.url}
            onChange={v => setForm(f => ({ ...f, url: v }))}
          />
          <Field
            label="Price CSS Selector *"
            placeholder=".price, #productPrice, .a-price .a-offscreen"
            value={form.selector_price}
            onChange={v => setForm(f => ({ ...f, selector_price: v }))}
            hint="Right-click the price on the page → Inspect → copy the selector"
          />
          <Field
            label="Title CSS Selector (optional)"
            placeholder="#productTitle, h1.product-name"
            value={form.selector_title}
            onChange={v => setForm(f => ({ ...f, selector_title: v }))}
          />
          <Field
            label="Custom Name (optional)"
            placeholder="Leave blank to use page title"
            value={form.name}
            onChange={v => setForm(f => ({ ...f, name: v }))}
          />

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.formActions}>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading}>
              {loading ? '⏳ Scraping initial price…' : '🦅 Start Tracking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', hint }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        type={type}
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
