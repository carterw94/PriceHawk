import styles from './Navbar.module.css';

export default function Navbar({ onAdd }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.logo}>🦅</span>
        <span className={styles.name}>PriceHawk</span>
        <span className={styles.tagline}>e-commerce price tracker</span>
      </div>
      <button className={styles.addBtn} onClick={onAdd}>
        + Track Product
      </button>
    </nav>
  );
}
