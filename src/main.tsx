import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { SharedFilterProvider } from './contexts/SharedFilterContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';

// Remove SqlUtilService import and related logic
// import { SqlUtilService } from './services/SqlUtilService';
// import { DataSyncService } from './services/DataSyncService';

const queryClient = new QueryClient();

// Remove the async IIFE related to schema initialization
/*
(async () => {
  try {
    console.log('Database schema initialization attempt complete');
    await SqlUtilService.ensureDatabaseSchema(); // Remove this call
    console.log('Database schema setup event:', { success: true, message: 'Database schema setup complete' });
  } catch (error) {
    console.error('Error during initial database setup:', error);
    console.log('Database schema setup event:', { success: false, message: 'Database schema setup failed', error });
  }

  // Run initial metrics sync after ensuring schema
  try {
    await DataSyncService.syncAllMetrics(); // Keep initial sync if needed, but doesn't depend on SqlUtilService now
    console.log('Initial metrics sync attempt finished.');
  } catch (error) {
    console.error('Error during initial metrics sync:', error);
  }
})();
*/

// Simplify rendering
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SharedFilterProvider>
          <App />
          <Toaster />
        </SharedFilterProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

// Optional: Keep initial connection check if desired, or remove if AppLayout handles it
/*
async function checkInitialConnection() {
  console.log('Performing initial connection check');
  const connected = await ConnectionService.checkConnection(true); 
  console.log('Initial connection check result:', connected ? 'online' : 'offline');
}
checkInitialConnection();
*/
