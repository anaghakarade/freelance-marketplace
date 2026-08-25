import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSuccess(true);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 68px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-2xl) var(--space-md)' }}>
      <div style={{
        background: 'var(--glass-bg-primary)',
        backdropFilter: 'blur(var(--glass-blur-primary))',
        WebkitBackdropFilter: 'blur(var(--glass-blur-primary))',
        border: '1px solid var(--glass-border-primary)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-2xl)',
        width: '100%',
        maxWidth: '420px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-2xs)' }}>Reset Password</h2>
        
        {success ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-sm) 0' }}>
            <div className="badge badge-success" style={{ display: 'inline-block', padding: '8px 16px', marginBottom: 'var(--space-md)' }}>
              ✓ Reset Link Dispatched
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
              Check your email <strong style={{ color: 'var(--color-text-main)' }}>{email}</strong> for instructions on setting up your new password.
            </p>
            <Button to="/login" variant="primary" fullWidth style={{ height: '44px' }}>Return to Login</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)' }}>
              Enter your account email and we'll send you a password reset link.
            </p>
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" fullWidth style={{ height: '44px', marginTop: 'var(--space-xs)' }}>
              Send Reset Link
            </Button>
          </form>
        )}

        {!success && (
          <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-lg)' }}>
            Remembered your password?{' '}
            <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>Login</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
