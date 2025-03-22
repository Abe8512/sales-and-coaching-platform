import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startMetricsSyncScheduler } from './services/DataSyncService';
import { ensureDatabaseSchema } from './services/SqlUtilService';
import { checkSupabaseConnection } from './integrations/supabase/client';
import { errorHandler } from './services/ErrorHandlingService';

// Attempt to set up database schema but continue with app rendering regardless
ensureDatabaseSchema().then(() => {
  console.log('Database schema initialization attempt complete');

  // Perform an immediate connection check
  // Force connection status to online initially
  errorHandler.setOffline(false);

  // Try to check connection immediately
  setTimeout(() => {
    console.log('Performing initial connection check');
    checkSupabaseConnection().then(connected => {
      console.log(`Initial connection check result: ${connected ? 'online' : 'offline'}`);
      errorHandler.setOffline(!connected);
    }).catch(error => {
      console.error('Initial connection check failed:', error);
      errorHandler.setOffline(true);
    });
  }, 1000);
}).catch(error => {
  // Just log the error, don't prevent app from loading
  console.error('Error during database schema initialization:', error);
});

// Listen for database setup events
window.addEventListener('database-schema-setup-complete', (event: Event) => {
  const customEvent = event as CustomEvent;
  console.log('Database schema setup event:', customEvent.detail);
});

// Initialize the data sync scheduler to keep metrics in sync
// This will synchronize data between primary tables and summary tables every 5 minutes
const cleanupDataSync = startMetricsSyncScheduler();

// Add event listener to clean up on window unload
window.addEventListener('beforeunload', () => {
  cleanupDataSync();
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
