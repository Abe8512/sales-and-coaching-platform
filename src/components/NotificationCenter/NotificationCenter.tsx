
import React, { useState, useEffect } from "react";
import { X, Bell, FileAudio, MessageSquare, BarChart, Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStoredTranscriptions } from "@/services/WhisperService";
import { format, isToday, isYesterday } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
  read: boolean;
  linkTo?: string;
}

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Generate notifications from transcription data
  useEffect(() => {
    const transcriptions = getStoredTranscriptions();
    const notificationStorage = localStorage.getItem('notifications');
    const readNotifications: Record<string, boolean> = notificationStorage ? JSON.parse(notificationStorage) : {};
    
    // Generate notifications from transcriptions
    const newNotifications: Notification[] = transcriptions.map(transcript => {
      const date = new Date(transcript.date);
      let timeString;
      
      if (isToday(date)) {
        timeString = `Today at ${format(date, 'h:mm a')}`;
      } else if (isYesterday(date)) {
        timeString = `Yesterday at ${format(date, 'h:mm a')}`;
      } else {
        timeString = format(date, 'MMM d, yyyy');
      }
      
      return {
        id: transcript.id,
        title: transcript.filename || `New Transcript`,
        description: `New call transcript added${transcript.sentiment ? ` with ${transcript.sentiment} sentiment` : ''}.`,
        time: timeString,
        icon: <FileAudio className="h-4 w-4 text-blue-500" />,
        read: readNotifications[transcript.id] || false,
        linkTo: '/transcripts'
      };
    });
    
    // Add system notifications
    if (transcriptions.length > 0) {
      // Add insights notification
      newNotifications.push({
        id: 'insights-' + Date.now(),
        title: 'New Insights Available',
        description: 'AI has generated new insights based on recent calls.',
        time: 'Just now',
        icon: <BarChart className="h-4 w-4 text-purple-500" />,
        read: false,
        linkTo: '/ai-coaching'
      });
    }
    
    // Sort by date (newer first)
    newNotifications.sort((a, b) => {
      // Special handling for "Just now"
      if (a.time === 'Just now') return -1;
      if (b.time === 'Just now') return 1;
      
      // Handle Today/Yesterday
      if (a.time.startsWith('Today') && !b.time.startsWith('Today')) return -1;
      if (!a.time.startsWith('Today') && b.time.startsWith('Today')) return 1;
      if (a.time.startsWith('Yesterday') && !b.time.startsWith('Yesterday') && !b.time.startsWith('Today')) return -1;
      if (!a.time.startsWith('Yesterday') && b.time.startsWith('Yesterday')) return 1;
      
      return 0;
    });
    
    setNotifications(newNotifications);
    setUnreadCount(newNotifications.filter(n => !n.read).length);
  }, [isOpen]); // Refresh when popover opens

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    setUnreadCount(0);
    
    // Update localStorage
    const readStatus: Record<string, boolean> = {};
    updatedNotifications.forEach(n => {
      readStatus[n.id] = true;
    });
    localStorage.setItem('notifications', JSON.stringify(readStatus));
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    const updatedNotifications = notifications.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
    setUnreadCount(updatedNotifications.filter(n => !n.read).length);
    
    // Update localStorage
    const notificationStorage = localStorage.getItem('notifications');
    const readNotifications: Record<string, boolean> = notificationStorage ? JSON.parse(notificationStorage) : {};
    readNotifications[notification.id] = true;
    localStorage.setItem('notifications', JSON.stringify(readNotifications));
    
    // Navigate if linkTo is provided
    if (notification.linkTo) {
      setIsOpen(false);
      navigate(notification.linkTo);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] bg-red-500 flex items-center justify-center text-white"
              variant="default"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto py-1 px-2 text-xs">
              Mark all as read
            </Button>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                  notification.read ? 'opacity-70' : 'bg-muted/20'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {notification.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.description}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground mt-2">
                      <Clock className="h-3 w-3 mr-1" />
                      {notification.time}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
