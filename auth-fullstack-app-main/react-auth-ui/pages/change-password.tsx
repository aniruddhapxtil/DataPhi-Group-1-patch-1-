import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../services/api';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Clear session for security
    localStorage.removeItem('token');
  }, []);

  const handleChangePassword = async () => {
    try {
      const response = await api.post('/auth/change-password', {
        email,
        old_password: oldPassword,
        new_password: newPassword,
      });
      setSuccessMessage(response.data.message);
      setErrorMessage('');
    } catch (error: any) {
      setSuccessMessage('');
      setErrorMessage(error.response?.data?.detail || 'Failed to change password');
    }
  };

  return (
    <div className="centered-container">
      <div className="auth-container">
        <h1>Change Password</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Old Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button onClick={handleChangePassword}>
          Change Password
        </button>
        {successMessage && (
          <div className="text-green-400 mb-2">{successMessage}</div>
        )}
        {errorMessage && (
          <div className="text-red-400 mb-2">{errorMessage}</div>
        )}
        <div className="link-text">
          <a onClick={() => router.push('/login')}>
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
