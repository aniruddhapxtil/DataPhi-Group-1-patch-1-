import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="centered-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="centered-container">
        <p>Please login to see your profile.</p>
        <button onClick={() => router.push('/login')} className="send-button">
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="centered-container">
      <div className="auth-container">
        <h1>Profile</h1>
        <div className="profile-card">
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>
        <div className="profile-buttons flex flex-col gap-4">
          <button onClick={() => router.push('/chat')} className="send-button">
            Go to Chat Sessions
          </button>
          <button onClick={() => router.push('/change-password')} className="send-button">
            Change Password
          </button>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
