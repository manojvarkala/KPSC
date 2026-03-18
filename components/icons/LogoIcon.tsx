
import React from 'react';

interface LogoProps {
    className?: string;
    variant?: 'transparent' | 'dark';
}

export const LogoIcon: React.FC<LogoProps> = ({ className, variant = 'transparent' }) => {
    // Use reliable external URLs as primary sources to prevent flashing from missing local files
    const logoSrc = variant === 'transparent' 
        ? 'https://raw.githubusercontent.com/cusatalumni/KPSC/main/logo-transparent.png' 
        : 'https://raw.githubusercontent.com/cusatalumni/KPSC/main/logo-dark.png';
    
    return (
        <div className={`${className} flex items-center justify-center overflow-hidden`}>
            <img 
                src={logoSrc} 
                alt="PSC Guidance Kerala Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                    // Fallback if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://raw.githubusercontent.com/cusatalumni/KPSC/main/logo-transparent.png'; // Example fallback or hide
                    target.onerror = null;
                }}
            />
        </div>
    );
};
