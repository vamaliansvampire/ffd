import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { resolveImageUrl } from '../assets/imageRegistry';

export function NexoraLogoMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="24"
        stroke="url(#brandBlue)"
        strokeWidth="2.2"
        strokeDasharray="106 26"
      />
      <circle cx="32" cy="32" r="16" stroke="url(#brandGold)" strokeWidth="2" />
      <path
        d="M23.5 41.5V22.5L40.5 41.5V22.5"
        stroke="#F4F4F6"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="brandGold" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5D77F" />
          <stop offset="1" stopColor="#B88E1E" />
        </linearGradient>
        <linearGradient id="brandBlue" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function SafeImage({ src, alt, className = '', fallbackTitle }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveImageUrl(src);

  if (!resolved || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0F131D] via-[#090B10] to-[#13110C] text-[#D4AF37]/80 border border-white/10 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Sparkles className="w-6 h-6 mb-2 opacity-70" />
        {fallbackTitle && (
          <span className="font-display text-xs tracking-wider text-zinc-400 px-3 text-center">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
