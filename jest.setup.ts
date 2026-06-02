import '@testing-library/jest-dom';

process.env.R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? 'https://example.r2.dev';
process.env.NEXT_PUBLIC_R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? process.env.R2_PUBLIC_URL;
