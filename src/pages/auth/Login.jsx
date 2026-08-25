import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Email address is required.'); return; }
    setLoading(true);
    try {
      const user = authService.login(email);
      setLoading(false);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'buyer') navigate('/buyer');
      else navigate('/seller');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Login failed.');
    }
  };

  const handleQuickLogin = (quickEmail) => {
    setEmail(quickEmail);
    setError('');
    try {
      const user = authService.login(quickEmail);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'buyer') navigate('/buyer');
      else navigate('/seller');
    } catch (err) {
      setError(err.message);
    }
  };

  const credentials = [
    { label: 'Sarah Jenkins', role: 'Freelancer Provider', email: 'sarah.j@workstream.io' },
    { label: 'Alice Cooper', role: 'Corporate Buyer', email: 'alice@corporateventures.com' },
    { label: 'Admin Chief', role: 'Administrator', email: 'admin@workstream.io' },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 68px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-2xl) var(--space-md)' }}>
      
      {/* Brand Header */}
      <Link to="/" style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: '#fff', textDecoration: 'none', marginBottom: 'var(--space-lg)' }}>
        Work<span style={{ color: 'var(--color-accent)' }}>Stream</span>
      </Link>

      {/* Main Login Card */}
      <div style={{
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-2xl)',
        width: '100%',
        maxWidth: '420px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '4px', fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: '#fff' }}>Welcome back</h2>
        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)' }}>
          Sign in to your WorkStream account
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 'var(--space-md)', color: '#f87171', fontSize: 'var(--text-sm)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)', fontSize: 'var(--text-xs)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              Remember me
            </label>
            <Link to="/forgot-password" style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)', textDecoration: 'none' }}>
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={loading} style={{ height: '44px' }}>
            Log In
          </Button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 'var(--space-lg) 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: '11px', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Or continue with</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Google OAuth Button Simulation */}
        <button
          onClick={() => handleQuickLogin('sarah.j@workstream.io')}
          style={{
            width: '100%',
            height: '40px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            fontSize: 'var(--text-sm)',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Google
        </button>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-xl)', marginBottom: 0 }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)', textDecoration: 'none' }}>
            Sign Up
          </Link>
        </p>
      </div>

      {/* Prototype Quick Roles */}
      <div style={{
        width: '100%', maxWidth: '420px', marginTop: 'var(--space-lg)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-md)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-light)', textAlign: 'center', marginBottom: 'var(--space-sm)', fontWeight: 'var(--weight-semibold)' }}>
          Prototype Quick Sign In
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {credentials.map(({ label, role, email: credEmail }) => (
            <button
              key={credEmail}
              onClick={() => handleQuickLogin(credEmail)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: '#fff' }}>{label}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{role}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)', fontFamily: 'monospace' }}>{credEmail}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Login;
