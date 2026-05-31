import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const { getRedirectPath } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl mb-4">🚫</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
        <Link to={getRedirectPath()} className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700">
          Go to My Dashboard
        </Link>
      </div>
    </div>
  );
}
