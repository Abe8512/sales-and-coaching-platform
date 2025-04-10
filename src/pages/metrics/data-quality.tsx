import React from 'react';
import Head from 'next/head';
import AppLayout from '@/components/Layout/AppLayout';
import MetricsDataQuality from '@/components/Metrics/MetricsDataQuality';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MetricsDataQualityPage() {
  return (
    <>
      <Head>
        <title>Metrics Data Quality | Future Sentiment Analytics</title>
        <meta name="description" content="Monitor metrics data quality and consistency" />
      </Head>

      <AppLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Metrics Monitoring Dashboard</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Metrics Monitoring</CardTitle>
              <CardDescription>
                Monitor the health, consistency, and quality of your analytics metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="health" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="health">Data Quality</TabsTrigger>
                  <TabsTrigger value="scheduled" disabled>Scheduled Jobs</TabsTrigger>
                  <TabsTrigger value="errors" disabled>Error Logs</TabsTrigger>
                </TabsList>
                
                <TabsContent value="health" className="space-y-4">
                  <MetricsDataQuality />
                </TabsContent>
                
                <TabsContent value="scheduled">
                  <p className="text-muted-foreground text-center py-8">
                    Scheduled jobs monitoring coming soon
                  </p>
                </TabsContent>
                
                <TabsContent value="errors">
                  <p className="text-muted-foreground text-center py-8">
                    Error logs monitoring coming soon
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </>
  );
} 