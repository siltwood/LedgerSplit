import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div>
      <nav style={{
        background: colors.primary,
        padding: '15px 20px',
        color: colors.text,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link to="/dashboard" style={{ color: colors.text, textDecoration: 'none', fontSize: '20px', fontWeight: 'bold' }}>
            BillSplit
          </Link>
          {user && (
            <>
              <Link to="/dashboard" style={{ color: colors.text, textDecoration: 'none' }}>
                Dashboard
              </Link>
              <Link to="/groups" style={{ color: 'white', textDecoration: 'none' }}>
                Groups
              </Link>
              <Link to="/expenses" style={{ color: 'white', textDecoration: 'none' }}>
                Expenses
              </Link>
              <Link to="/friends" style={{ color: 'white', textDecoration: 'none' }}>
                Friends
              </Link>
            </>
          )}
        </div>

        {user && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span>{user.name}</span>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                background: colors.background,
                color: colors.text,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}