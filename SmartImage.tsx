import { useState } from 'react';
import { Coins } from 'lucide-react';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function SmartImage({ src, alt, className = '' }: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#191B24] via-[#12141B] to-[#0B0C10] text-[#D4AF37] border border-[#D4AF37]/15 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Coins className="w-8 h-8 mb-2 opacity-80" strokeWidth={1.6} />
        <span className="text-xs font-medium text-[#B8B0A0] px-4 text-center line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
