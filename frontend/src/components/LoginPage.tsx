'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/useTranslation';
import { Mail, Lock, User, Eye, EyeOff, Shield } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const validateForm = () => {
    if (!email || !password) {
      setError(t.auth.emailRequired);
      return false;
    }

    if (!email.includes('@')) {
      setError(t.auth.emailInvalid);
      return false;
    }

    if (password.length < 8) {
      setError(t.auth.passwordTooShort);
      return false;
    }

    if (!isLogin && password !== confirmPassword) {
      setError(t.auth.passwordMismatch);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password, totpCode || undefined);
      } else {
        if (!username) {
          setError(t.auth.emailRequired);
          setLoading(false);
          return;
        }
        await register(email, username, password);
      }
    } catch (err: any) {
      const errorMessage = err.message || '';
      
      // Check if 2FA is required
      if (errorMessage.includes('2FA')) {
        setNeeds2FA(true);
        setError(t.auth.twoFactorRequired);
      } else if (errorMessage.includes('locked')) {
        setError(t.auth.accountLocked);
      } else {
        setError(errorMessage || t.auth.invalidCredentials);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-md p-8">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Synora
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Think Beyond.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              {isLogin ? t.auth.login : t.auth.register}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLogin ? t.auth.noAccount : t.auth.hasAccount}{' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setNeeds2FA(false);
                }}
                className="text-gray-900 dark:text-white font-medium hover:underline"
              >
                {isLogin ? t.auth.register : t.auth.login}
              </button>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.auth.email}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Username (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.auth.username}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                    placeholder={t.auth.username}
                    required
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.auth.password}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.auth.confirmPassword}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {/* 2FA Code (if needed) */}
            {needs2FA && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={20} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    {t.auth.twoFactorRequired}
                  </span>
                </div>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-amber-300 dark:border-amber-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t.common.loading : isLogin ? t.auth.loginButton : t.auth.registerButton}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Synora v1.0.0 • Think Beyond.
        </p>
      </div>
    </div>
  );
}
