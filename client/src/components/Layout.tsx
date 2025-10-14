import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttons';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: colors.primary,
        padding: '15px 20px',
        color: colors.text,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Link to="/dashboard" style={{ color: colors.text, textDecoration: 'none', fontSize: '20px', fontWeight: 'bold' }}>
            LedgerSplit
          </Link>

          {user && (
            <>
              {/* Hamburger menu for mobile */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  display: 'none',
                  background: colors.purple,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '8px 10px',
                  flexDirection: 'column',
                  gap: '4px',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                className="mobile-menu-button"
              >
                <div style={{ width: '20px', height: '2px', background: '#fff' }} />
                <div style={{ width: '20px', height: '2px', background: '#fff' }} />
                <div style={{ width: '20px', height: '2px', background: '#fff' }} />
              </button>

              {/* Desktop navigation */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }} className="desktop-nav">
                <Link to="/dashboard" style={{
                  color: colors.text,
                  textDecoration: 'none',
                  fontWeight: location.pathname === '/dashboard' ? 'bold' : 'normal',
                  fontSize: '20px'
                }}>
                  Dashboard
                </Link>
                <Link to="/settings" style={{
                  color: colors.text,
                  textDecoration: 'none',
                  fontWeight: location.pathname === '/settings' ? 'bold' : 'normal',
                  fontSize: '20px'
                }}>
                  Settings
                </Link>
                <span style={{ color: colors.text, fontSize: '20px' }}>{user.name}</span>
                <button
                  onClick={handleLogout}
                  style={{
                    ...buttonStyles.small,
                    padding: '8px 16px',
                    fontSize: '18px'
                  }}
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>

      </nav>

      {/* Mobile navigation menu overlay */}
      {user && mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'none',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 998
            }}
            className="mobile-nav-backdrop"
          />
          {/* Menu */}
          <div style={{
            display: 'none',
            position: 'fixed',
            top: '60px',
            right: '10px',
            width: '250px',
            flexDirection: 'column',
            gap: '10px',
            padding: '15px',
            background: colors.primary,
            border: `2px solid ${colors.border}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 999
          }} className="mobile-nav">
            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} style={{
              color: colors.text,
              textDecoration: 'none',
              padding: '10px',
              fontWeight: location.pathname === '/dashboard' ? 'bold' : 'normal',
              fontSize: '20px'
            }}>
              Dashboard
            </Link>
            <Link to="/settings" onClick={() => setMobileMenuOpen(false)} style={{
              color: colors.text,
              textDecoration: 'none',
              padding: '10px',
              fontWeight: location.pathname === '/settings' ? 'bold' : 'normal',
              fontSize: '20px'
            }}>
              Settings
            </Link>
            <div style={{ padding: '10px', color: colors.text, fontSize: '20px', fontWeight: 'bold', borderTop: `1px solid ${colors.border}`, marginTop: '5px', paddingTop: '15px' }}>
              {user.name}
            </div>
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              style={{
                ...buttonStyles.small,
                padding: '10px 16px',
                fontSize: '18px',
                textAlign: 'center'
              }}
            >
              Logout
            </button>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-button {
            display: flex !important;
          }
          .mobile-nav {
            display: flex !important;
          }
          .mobile-nav-backdrop {
            display: block !important;
          }
        }
      `}</style>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer style={{
        background: colors.surface,
        padding: '15px 20px',
        textAlign: 'center',
        borderTop: `1px solid ${colors.border}`
      }}>
        <div style={{ color: colors.text, fontSize: '20px' }}>
          Need help? Contact us at{' '}
          <a href="mailto:hello@ledgersplit.com" style={{ color: colors.text, textDecoration: 'underline' }}>
            hello@ledgersplit.com
          </a>
        </div>
      </footer>
    </div>
  );
}