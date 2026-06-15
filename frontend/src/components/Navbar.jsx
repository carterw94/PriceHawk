import styles from './Navbar.module.css';

export default function Navbar({ onAdd, user, onLogout, onAdmin }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.logo}>🦅</span>
        <span className={styles.name}>PriceHawk</span>
        <span className={styles.tagline}>e-commerce price tracker</span>
      </div>
      <div className={styles.right}>
        {user && (
          <span className={styles.userEmail}>
            {user.role === 'admin' && <span className={styles.adminBadge}>admin</span>}
            {user.email}
          </span>
        )}
        {user?.role === 'admin' && (
          <button className={styles.adminBtn} onClick={onAdmin} title="Admin dashboard">
            👥 Users
          </button>
        )}
        <button className={styles.addBtn} onClick={onAdd}>+ Track Product</button>
        {user && (
          <button className={styles.logoutBtn} onClick={onLogout} title="Sign out">
            Sign out
          </button>
        )}
      </div>
    </nav>
  );
}