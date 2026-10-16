import type { FC } from 'react';

type BrandMarkProps = { className?: string };

export const BrandMark: FC<BrandMarkProps> = ({ className = 'h-7 w-7' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 20.25s-7.5-4.35-7.5-10.1a4.15 4.15 0 0 1 7.5-2.43 4.15 4.15 0 0 1 7.5 2.43c0 5.75-7.5 10.1-7.5 10.1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M8.5 12h2l1.1-2.2 1.5 4.4 1.1-2.2h1.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
