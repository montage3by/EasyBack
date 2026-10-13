import React, { useState } from 'react';

interface UserAvatarProps {
  avatarUrl?: string | null;
  username: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
  className?: string;
  style?: React.CSSProperties;
  borderColor?: string;
}

const SIZE_CLASSES: Record<string, string> = {
  xs: 'w-6 h-6 text-[10px] rounded-lg',
  sm: 'w-8 h-8 text-xs rounded-xl',
  md: 'w-10 h-10 text-sm rounded-xl',
  lg: 'w-12 h-12 text-base rounded-2xl',
  xl: 'w-16 h-16 text-xl rounded-2xl',
  '2xl': 'w-20 h-20 text-2xl rounded-3xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  username,
  color = '#06b6d4',
  size = 'md',
  className = '',
  style = {},
  borderColor,
}) => {
  const [imgError, setImgError] = useState(false);
  const effectiveBorderColor = borderColor || color;

  const initial = username?.trim()?.[0]?.toUpperCase() || 'P';
  const hasValidImage = Boolean(avatarUrl && avatarUrl.trim().length > 0 && !imgError);

  const baseSizeClass = size !== 'custom' ? SIZE_CLASSES[size] || SIZE_CLASSES.md : '';

  if (hasValidImage) {
    return (
      <img
        src={avatarUrl!}
        alt={username}
        onError={() => setImgError(true)}
        className={`${baseSizeClass} object-cover border-2 shadow-md transition-transform ${className}`}
        style={{ borderColor: effectiveBorderColor, ...style }}
      />
    );
  }

  // Solid color avatar chosen by the user
  return (
    <div
      className={`${baseSizeClass} border-2 shadow-md flex items-center justify-center font-black select-none transition-transform shrink-0 ${className}`}
      style={{
        backgroundColor: color,
        borderColor: effectiveBorderColor,
        ...style,
      }}
      title={username}
    >
      <span className="text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] leading-none">
        {initial}
      </span>
    </div>
  );
};
