import { useState } from 'react';
import { Lock } from 'lucide-react';
import type { AdminUser } from '../types';
import { NexoraLogoMark } from '../components/BrandMark';
import { api } from '../lib/api';

interface AdminLoginPageProps {
  onLoginSuccess: (admin: AdminUser) => void;
  onNavigate: (path: string) => void;
}

export function AdminLoginPage({ onLoginSuccess, onNavigate }: AdminLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.login(email.trim(), password);
      onLoginSuccess(res.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md glass-surface-gold rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0D1018] border border-white/10 mx-auto">
            <NexoraLogoMark className="w-7 h-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Administrator Sign In
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Authorized personnel access for NEXORA AI platform management.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Administrator Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs sm:text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-lg bg-[#D4AF37] text-[#06070A] font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-[#E5C158] transition-colors disabled:opacity-60"
          >
            <Lock className="w-4 h-4" />
            <span>{submitting ? 'Signing In...' : 'Sign In to Dashboard'}</span>
          </button>
        </form>

        <div className="pt-2 border-t border-white/[0.08] text-center">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Return to Public Website
          </button>
        </div>
      </div>
    </div>
  );
}
