'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/useTranslation';
import { getAuthHeaders } from '@/contexts/AuthContext';
import { Shield, Copy, Check, X } from 'lucide-react';
import Image from 'next/image';

interface TwoFactorSetupProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function TwoFactorSetup({ onClose, onSuccess }: TwoFactorSetupProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const setup2FA = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to setup 2FA');
      }

      const data = await response.json();
      setQrCode(data.qr_code_url);
      setSecret(data.secret);
      setBackupCodes(data.backup_codes);
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ totp_code: verificationCode }),
      });

      if (!response.ok) {
        throw new Error('Invalid verification code');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 'setup' && !qrCode) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                <Shield size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t.auth.setup2FA}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t.auth.enable2FA}
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-3 mb-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={setup2FA}
            disabled={loading}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? t.common.loading : t.common.confirm}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
              <Shield size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t.auth.setup2FA}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* QR Code Section */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t.auth.scanQRCode}
          </h3>
          <div className="flex justify-center p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
            {qrCode && (
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            {t.auth.enterCodeFromApp}
          </p>
        </div>

        {/* Backup Codes */}
        <div className="mb-6 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {t.auth.backupCodes}
            </h3>
            <button
              onClick={copyBackupCodes}
              className="flex items-center gap-2 px-3 py-1 bg-amber-200 dark:bg-amber-900 hover:bg-amber-300 dark:hover:bg-amber-800 rounded text-xs font-medium text-amber-900 dark:text-amber-100 transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy All'}
            </button>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-200 mb-3">
            {t.auth.backupCodesWarning}
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="px-3 py-2 bg-white dark:bg-gray-950 border border-amber-200 dark:border-amber-800 rounded text-center text-amber-900 dark:text-amber-100"
              >
                {code}
              </div>
            ))}
          </div>
        </div>

        {/* Verification */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t.auth.verify2FA}
          </label>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white text-center text-lg tracking-widest"
            placeholder="000000"
            maxLength={6}
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-3 mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={verify2FA}
          disabled={loading || verificationCode.length !== 6}
          className="w-full py-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t.common.loading : t.auth.verify2FA}
        </button>
      </div>
    </div>
  );
}
