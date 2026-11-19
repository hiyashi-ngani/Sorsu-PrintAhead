import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { validateSorSUEmail, SIGNUP_ROLES, type SelfSignupRole } from '../../utils/rules.ts';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onBackToLanding?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onBackToLanding }) => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<SelfSignupRole>('student');
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        throw new Error('Please enter your SorSU email.');
      }
      if (!validateSorSUEmail(cleanEmail)) {
        throw new Error('Only official @sorsu.edu.ph email addresses are allowed.');
      }
      if (!password.trim()) {
        throw new Error('Please enter your password.');
      }

      await login(cleanEmail, password, fullName.trim() || undefined, selectedRole);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Use an official @sorsu.edu.ph account.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const isBusy = loading || googleLoading;

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#800000] mb-5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
        )}

        {/* University Header Brand */}
        <div className="text-center">
          <img
            src="/assets/aistudio/sorsu_0f1cec53.png"
            alt="Sorsogon State University Seal"
            className="w-16 h-16 rounded-full object-contain bg-white border border-[#E5E5E5] p-1 mx-auto mb-3 shadow-xs"
          />
          <h1 className="text-2xl font-extrabold text-[#242424] tracking-tight">
            Sorsu: <span className="text-[#800000]">PrintAhead</span>
          </h1>
          <p className="mt-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            SorSU &bull; Bulan Campus
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        <div className="bg-white py-7 px-6 sm:px-8 rounded-2xl shadow-xs border border-[#E5E5E5]">
          {error && (
            <div
              role="alert"
              className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In (@sorsu.edu.ph only) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isBusy}
              className="gsi-material-button"
              data-testid="google-signin-button"
            >
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                </div>
                <span>
                  {googleLoading ? 'Verifying @sorsu.edu.ph...' : 'Sign in with Google (@sorsu.edu.ph)'}
                </span>
              </div>
            </button>
            <p className="text-[11px] text-center text-gray-500">
              Google Sign-In accepts <code className="font-mono text-[#800000]">@sorsu.edu.ph</code> accounts only
            </p>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E5E5E5]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              or sign in with email
            </span>
            <div className="h-px flex-1 bg-[#E5E5E5]" />
          </div>

          {/* Standard Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-[#242424] mb-1">
                SorSU Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username@sorsu.edu.ph"
                  className="block w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-[#242424] mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="block w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#242424] focus:outline-none focus-visible:text-[#800000] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isNewUser && (
              <div className="space-y-3 pt-2 border-t border-[#E5E5E5]">
                <div>
                  <label htmlFor="fullName" className="block text-xs font-bold text-[#242424] mb-1">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Maria Clara"
                    className="block w-full px-3 py-2 text-sm bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-xs font-bold text-[#242424] mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as SelfSignupRole)}
                    className="block w-full px-3 py-2 text-sm bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  >
                    {SIGNUP_ROLES.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setIsNewUser(!isNewUser)}
                className="text-[#800000] hover:underline font-semibold"
              >
                {isNewUser ? 'Existing account? Sign in' : 'New SorSU user? Register'}
              </button>
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-[#800000] hover:bg-[#5C0000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] transition-colors disabled:opacity-60"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
