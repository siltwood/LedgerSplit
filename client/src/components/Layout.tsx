import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';

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
    <div>
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
                  background: 'transparent',
                  border: 'none',
                  color: colors.text,
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '5px',
                }}
                className="mobile-menu-button"
              >
                ☰
              </button>

              {/* Desktop navigation */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }} className="desktop-nav">
                <Link to="/dashboard" style={{
                  color: colors.text,
                  textDecoration: 'none',
                  fontWeight: location.pathname === '/dashboard' ? 'bold' : 'normal',
                  fontSize: '16px'
                }}>
                  Dashboard
                </Link>
                <Link to="/events" style={{
                  color: colors.text,
                  textDecoration: 'none',
                  fontWeight: location.pathname.startsWith('/events') ? 'bold' : 'normal',
                  fontSize: '16px'
                }}>
                  Events
                </Link>
                <Link to="/friends" style={{
                  color: colors.text,
                  textDecoration: 'none',
                  fontWeight: location.pathname === '/friends' ? 'bold' : 'normal',
                  fontSize: '16px'
                }}>
                  Friends
                </Link>
                <Link to="/settings" style={{
                  color: colors.text,
                  textDecoration: 'none',
                  fontWeight: location.pathname === '/settings' ? 'bold' : 'normal',
                  fontSize: '16px'
                }}>
                  Settings
                </Link>
                <span style={{ color: colors.text, fontSize: '16px' }}>{user.name}</span>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '8px 16px',
                    background: colors.background,
                    color: colors.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile navigation menu */}
        {user && mobileMenuOpen && (
          <div style={{
            display: 'none',
            width: '100%',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '15px',
            paddingTop: '15px',
            borderTop: `1px solid ${colors.border}`,
          }} className="mobile-nav">
            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} style={{
              color: colors.text,
              textDecoration: 'none',
              padding: '10px',
              fontWeight: location.pathname === '/dashboard' ? 'bold' : 'normal',
              fontSize: '16px'
            }}>
              Dashboard
            </Link>
            <Link to="/events" onClick={() => setMobileMenuOpen(false)} style={{
              color: colors.text,
              textDecoration: 'none',
              padding: '10px',
              fontWeight: location.pathname.startsWith('/events') ? 'bold' : 'normal',
              fontSize: '16px'
            }}>
              Events
            </Link>
            <Link to="/friends" onClick={() => setMobileMenuOpen(false)} style={{
              color: colors.text,
              textDecoration: 'none',
              padding: '10px',
              fontWeight: location.pathname === '/friends' ? 'bold' : 'normal',
              fontSize: '16px'
            }}>
              Friends
            </Link>
            <Link to="/settings" onClick={() => setMobileMenuOpen(false)} style={{
              color: colors.text,
              textDecoration: 'none',
              padding: '10px',
              fontWeight: location.pathname === '/settings' ? 'bold' : 'normal',
              fontSize: '16px'
            }}>
              Settings
            </Link>
            <div style={{ padding: '10px', color: colors.text, fontSize: '16px', fontWeight: 'bold' }}>
              {user.name}
            </div>
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              style={{
                padding: '10px 16px',
                background: colors.background,
                color: colors.text,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                textAlign: 'left'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-button {
            display: block !important;
          }
          .mobile-nav {
            display: flex !important;
          }
        }
      `}</style>

      <main>
        <Outlet />
      </main>
    </div>
  );
}