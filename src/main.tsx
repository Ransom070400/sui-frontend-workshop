import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { WalletProvider } from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css'; 

const container = document.getElementById('root');

// Ensure the container exists before creating the root
if (container) {
  // Use createRoot from react-dom/client for React 18
  createRoot(container).render(
    // StrictMode is good practice for catching potential problems
    <StrictMode>
      {/* 2. WRAP the entire application in WalletProvider */}
      <WalletProvider>
        <App />
      </WalletProvider>
    </StrictMode>
  );
} else {
  // Optional: Add an error message if the root element is not found
  console.error('Failed to find the root element with ID "root"');
}