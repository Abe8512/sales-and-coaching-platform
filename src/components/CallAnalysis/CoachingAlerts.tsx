
import React, { useState, useEffect } from 'react';
import { useCallMetricsStore } from '@/store/useCallMetricsStore';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { throttle } from "lodash";

const CoachingAlerts = () => {
  const { coachingAlerts, dismissAlert, isRecording } = useCallMetricsStore();
  // Use local state to smooth transitions and prevent UI jitter
  const [visibleAlerts, setVisibleAlerts] = useState<any[]>([]);
  
  // Throttle the dismiss function to prevent UI jitter
  const throttledDismiss = throttle((id: string) => {
    dismissAlert(id);
  }, 200);
  
  // Update visible alerts with smooth transitions
  useEffect(() => {
    if (!isRecording) {
      setVisibleAlerts([]);
      return;
    }
    
    // Only show most recent 3 non-dismissed alerts with debounced updates
    const activeAlerts = coachingAlerts
      .filter(alert => !alert.dismissed)
      .slice(0, 3);
      
    setVisibleAlerts(activeAlerts);
  }, [coachingAlerts, isRecording]);
  
  if (!isRecording || visibleAlerts.length === 0) return null;
  
  const getAlertIcon = (type: 'warning' | 'info' | 'critical') => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getAlertColor = (type: 'warning' | 'info' | 'critical') => {
    switch (type) {
      case 'warning':
        return "border-amber-500/20 bg-amber-500/10";
      case 'critical':
        return "border-red-500/20 bg-red-500/10";
      case 'info':
        return "border-blue-500/20 bg-blue-500/10";
    }
  };
  
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full">
      <AnimatePresence>
        {visibleAlerts.map(alert => (
          <motion.div 
            key={alert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            layout
          >
            <Alert className={`${getAlertColor(alert.type)} backdrop-blur-sm`}>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div>
                    <AlertTitle className="flex items-center gap-2">
                      Coaching Alert
                      <Badge variant="outline" className="text-xs">
                        {alert.type === 'warning' ? 'Suggestion' : 
                         alert.type === 'critical' ? 'Critical' : 'Tip'}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-1">
                      {alert.message}
                    </AlertDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => throttledDismiss(alert.id)}
                  className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default CoachingAlerts;
