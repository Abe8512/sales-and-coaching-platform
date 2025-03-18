
import React from 'react';
import { useCallMetricsStore } from '@/store/useCallMetricsStore';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CoachingAlerts = () => {
  const { coachingAlerts, dismissAlert, isRecording } = useCallMetricsStore();
  
  // Filter out dismissed alerts and only show most recent 3
  const activeAlerts = coachingAlerts
    .filter(alert => !alert.dismissed)
    .slice(0, 3);
  
  if (!isRecording || activeAlerts.length === 0) return null;
  
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
        {activeAlerts.map(alert => (
          <motion.div 
            key={alert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
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
                  onClick={() => dismissAlert(alert.id)}
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
