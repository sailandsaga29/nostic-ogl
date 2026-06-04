import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { markLoginForRevenueCelebrationCheck } from '../utils/revenueMilestone';
import full from '../assets/full.png';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, getRedirectPath } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const user = await login(
        email,
        password
      );

      markLoginForRevenueCelebrationCheck();

      navigate(
        getRedirectPath(user.role)
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
          'Login failed'
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          'Unexpected error occurred'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full ">
      {/* Background Image */}
      <img
        src={full}
        alt="Nistic Background"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Optional soft overlay for readability */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Login Form Container */}
      <div className="relative h-screen w-full overflow-hidden">
        {/* Background */}
        <img
          src={full}
          alt="Nistic Background"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Login Area */}
        <div className="relative z-10 flex h-full items-end justify-center pb-8">
          <form
            onSubmit={handleSubmit}
            className="
        w-[90%]
        max-w-md
        rounded-3xl
        bg-white/8
        backdrop-blur-lg
        border border-white/20
        shadow-2xl
        px-6
        py-5
      "
          >
            {/* Title */}
            <div className="mb-4 text-center">


              <h2 className="text-sm text-black/70 mt-1">
                Sign in to continue
              </h2>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-xl border border-red-300/20 bg-red-500/20 px-4 py-2 text-sm text-black">
                {error}
              </div>
            )}

            {/* Inputs Row */}
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="Email"
                  required
                  className="
              w-full
              rounded-xl
              border border-white/20
              bg-white/15
              px-4
              py-3
              text-black
              placeholder:text-black/60
              outline-none
              focus:border-[#63d471]
              focus:ring-2
              focus:ring-[#63d471]
            "
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Password"
                  required
                  className="
              w-full
              rounded-xl
              border border-white/20
              bg-white/15
              px-4
              py-3
              text-black
              placeholder:text-black/60
              outline-none
              focus:border-[#63d471]
              focus:ring-2
              focus:ring-[#63d471]
            "
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="
            w-full
            rounded-xl
            bg-gradient-to-r
            from-[#00a8c5]
            to-[#63d471]
            py-3
            text-base
            font-semibold
            text-white
            transition
            hover:scale-[1.01]
          "
              >
                {loading
                  ? 'Signing in...'
                  : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}