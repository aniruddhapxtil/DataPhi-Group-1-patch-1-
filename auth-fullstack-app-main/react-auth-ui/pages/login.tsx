import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/chat');
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setSubmitLoading(true);
    const res = await login(email, password);
    setSubmitLoading(false);
    if (!res.success) {
      setMessage(res.message);
    }
  };

  if (loading || user) {
    return (
      <div className="centered-container">
        <p>Checking session...</p>
      </div>
    );
  }

  return (
    <div className="centered-container">
      <div className="auth-container">
        <form onSubmit={handleSubmit}>
          <h2>Login</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">
            {submitLoading ? 'Logging in...' : 'Login'}
          </button>
          {message && (
            <div className="text-red-400 text-center mt-2">{message}</div>
          )}
          <div className="link-text">
            Not registered yet?{' '}
            <a onClick={() => router.push('/register')}>
              Register here
            </a>
          </div>
          <div className="link-text">
            <a onClick={() => router.push('/forgot-password')}>
              Forgot Password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}