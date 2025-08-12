import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    const result = await register(username, email, password);
    setLoading(false);
    if (result.success) {
      setMessage('✅ Registered successfully! Redirecting...');
      setTimeout(() => router.push('/login'), 1500);
    } else {
      setMessage(`❌ Registration failed: ${result.message}`);
    }
  };

  return (
    <div className="centered-container">
      <div className="auth-container">
        <form onSubmit={handleSubmit}>
          <h2>Register</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
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
            {loading ? 'Registering...' : 'Register'}
          </button>
          {message && <div className="text-red-400 text-center mt-2">{message}</div>}
          <div className="link-text">
            Already registered?{' '}
            <a onClick={() => router.push('/login')}>
              Login here
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
