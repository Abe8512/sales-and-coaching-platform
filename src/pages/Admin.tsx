import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import DatabaseFixes from '@/components/admin/DatabaseFixes';
import { AdminToolbar } from '@/components/admin/AdminToolbar';

export default function Admin() {
  const { user } = useAuth();
  
  // Check if user is admin (this is a simple check - in a real app, you would have more robust role-based checks)
  const isAdmin = user?.role === 'admin' || user?.email === 'admin@example.com';
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Tools</h1>
        
        {!isAdmin ? (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access the admin tools. Please contact your administrator.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Database Management</h2>
              <p className="mb-6 text-muted-foreground">
                These tools help fix database schema issues and ensure the application functions correctly.
              </p>
              
              <div className="grid gap-6 md:grid-cols-2">
                <AdminToolbar />
                <DatabaseFixes />
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 