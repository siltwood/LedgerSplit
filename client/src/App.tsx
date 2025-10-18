import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import CreateSplit from './pages/CreateSplit';
import EditSplit from './pages/EditSplit';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';
import Settings from './pages/Settings';
import Privacy from './pages/Privacy';
import CookieConsent from './components/CookieConsent';
import GoogleAnalytics from './components/GoogleAnalytics';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function JoinRedirect() {
  const { token } = useParams();
  return <Navigate to={`/accept-invite?token=${token}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/join/:token" element={<JoinRedirect />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route element={<Layout />}>
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/splits/new"
              element={
                <PrivateRoute>
                  <CreateSplit />
                </PrivateRoute>
              }
            />
            <Route
              path="/events/new"
              element={
                <PrivateRoute>
                  <CreateEvent />
                </PrivateRoute>
              }
            />
            <Route
              path="/events/:id"
              element={
                <PrivateRoute>
                  <EventDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/events/:id/splits/new"
              element={
                <PrivateRoute>
                  <CreateSplit />
                </PrivateRoute>
              }
            />
            <Route
              path="/events/:id/splits/:splitId/edit"
              element={
                <PrivateRoute>
                  <EditSplit />
                </PrivateRoute>
              }
            />
            <Route
              path="/history"
              element={
                <PrivateRoute>
                  <History />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
          </Route>

          {/* Catch-all route for 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <GoogleAnalytics />
        <CookieConsent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;