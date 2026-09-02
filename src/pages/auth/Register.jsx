import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: searchParams.get('role') || 'buyer',
    accountType: 'individual',
    title: '',
    startingPrice: '50',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.email) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const user = await authService.register(formData);
      setLoading(false);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'buyer') navigate('/buyer');
      else navigate('/seller');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 68px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-2xl) var(--space-md)' }}>
      
      {/* Brand Header */}
      <Link to="/" style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: '#fff', textDecoration: 'none', marginBottom: 'var(--space-lg)' }}>
        Work<span style={{ color: 'var(--color-accent)' }}>Stream</span>
      </Link>

      {/* Main Registration Card */}
      <div style={{
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-2xl)',
        width: '100%',
        maxWidth: '480px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '4px', fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: '#fff' }}>Create Account</h2>
        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)' }}>
          Join WorkStream as a buyer or freelance provider
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 'var(--space-md)', color: '#f87171', fontSize: 'var(--text-sm)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Account Role Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <Select
              label="I want to"
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              options={[
                { value: 'buyer', label: 'Hire Talent (Buyer)' },
                { value: 'freelancer', label: 'Work (Freelancer)' }
              ]}
            />
            <Select
              label="Account Type"
              id="accountType"
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
              options={[
                { value: 'individual', label: 'Individual' },
                { value: 'corporate', label: 'Corporate' }
              ]}
            />
          </div>

          <Input
            label="Full Name / Company Name"
            name="name"
            placeholder="Jane Doe or Acme Corp"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            placeholder="jane@example.com"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
          />

          {formData.role === 'freelancer' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-sm)' }}>
              <Input
                label="Professional Title"
                name="title"
                placeholder="UI Designer, React Dev..."
                value={formData.title}
                onChange={handleChange}
                disabled={loading}
              />
              <Input
                label="Hourly Rate ($)"
                type="number"
                name="startingPrice"
                value={formData.startingPrice}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth loading={loading} style={{ height: '44px', marginTop: 'var(--space-xs)' }}>
            Create Account
          </Button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-xl)', marginBottom: 0 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)', textDecoration: 'none' }}>
            Log In
          </Link>
        </p>
      </div>

    </div>
  );
};

export default Register;
