import { useEffect, useState } from 'react';
import { getUsers } from '../api';
import styles from './AdminPanel.module.css';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr + 'Z').getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

export default function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(err => setError(err.response?.data?.error || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Admin Dashboard</h2>
            <p className={styles.subtitle}>
              {loading ? '…' : `${users.length} registered user${users.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading users…</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Signed up</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className={styles.emailCell}>{u.email}</td>
                    <td>
                      <span className={`${styles.badge} ${u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className={styles.dateCell} title={u.created_at}>
                      {timeAgo(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}