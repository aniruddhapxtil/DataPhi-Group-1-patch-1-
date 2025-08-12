import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../services/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Read the token from the URL query parameters
    const urlToken = router.query.token;
    if (urlToken && typeof urlToken === 'string') {
      setToken(urlToken);
    }
  }, [router.query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setMessage('Invalid or missing token.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post('/auth/reset-password', {
        token: token,
        new_password: newPassword,
      });
      setMessage(res.data.message);
      // Redirect to login page after successful password reset
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="centered-container">
      <div className="auth-container">
        <h2>Reset Password</h2>
        <p className="text-center text-sm mb-4 opacity-70">Please enter your new password.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
          {message && (
            <div className="text-sm text-center mt-4">
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
