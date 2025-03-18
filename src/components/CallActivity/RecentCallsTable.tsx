
import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import ContentLoader from "@/components/ui/ContentLoader";

interface Call {
  id: string;
  date: string;
  userName?: string;
  customerName?: string;
  duration?: number;
  outcome?: string | object;
  sentiment: number;
  nextSteps?: string;
}

interface RecentCallsTableProps {
  calls: Call[];
  isAdmin: boolean;
  isManager: boolean;
  loading?: boolean;
}

const RecentCallsTable: React.FC<RecentCallsTableProps> = ({ 
  calls, 
  isAdmin, 
  isManager,
  loading = false
}) => {
  const navigate = useNavigate();
  // Maintain stable data to prevent UI jitter during updates
  const [stableCalls, setStableCalls] = useState<Call[]>([]);
  
  useEffect(() => {
    // Only update when calls actually change and not loading
    if (!loading && calls.length > 0) {
      setStableCalls(calls);
    }
  }, [calls, loading]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
           ' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Calls</CardTitle>
        <CardDescription>
          {loading 
            ? 'Loading call data...'
            : calls.length > 0 
              ? `Showing ${calls.length} recent calls`
              : 'No calls match the current filters'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ContentLoader isLoading={loading} skeletonCount={3} height={200}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                {(isAdmin || isManager) && <TableHead>Rep</TableHead>}
                <TableHead>Customer</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Next Steps</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin || isManager ? 8 : 7} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <p>Loading call data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : stableCalls.length > 0 ? (
                stableCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>{formatDate(call.date)}</TableCell>
                    {(isAdmin || isManager) && <TableCell>{String(call.userName || 'Unknown')}</TableCell>}
                    <TableCell>{String(call.customerName || 'Unknown')}</TableCell>
                    <TableCell>{String(call.duration || '0')} min</TableCell>
                    <TableCell>
                      {typeof call.outcome === 'string' ? call.outcome : 
                       typeof call.outcome === 'object' && call.outcome !== null ? 'Complex Outcome' : 
                       String(call.outcome || 'N/A')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              call.sentiment > 0.7 ? 'bg-green-500' : 
                              call.sentiment > 0.4 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${call.sentiment * 100}%` }}
                          ></div>
                        </div>
                        <span>{Math.round(call.sentiment * 100)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{String(call.nextSteps || 'N/A')}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/transcripts?id=${call.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isAdmin || isManager ? 8 : 7} className="text-center py-8">
                    <p className="text-muted-foreground">No calls match the current filters</p>
                    <p className="text-sm mt-1">Try adjusting your filters or date range</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ContentLoader>
      </CardContent>
    </Card>
  );
};

export default RecentCallsTable;
