
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DateRange } from "react-day-picker";
import { TrendingUp, TrendingDown, Target, Phone, Clock, Calendar, DollarSign, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  title: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  icon: React.ReactNode;
  trend: number;
}

const GoalCard = ({ title, description, current, target, unit, icon, trend }: GoalCardProps) => {
  const progress = Math.min(100, Math.round((current / target) * 100));
  const isPositiveTrend = trend >= 0;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-end mb-2">
          <div className="text-3xl font-bold">
            {current}{unit}
          </div>
          <div className="text-sm text-muted-foreground">
            Target: {target}{unit}
          </div>
        </div>
        
        <Progress value={progress} className="h-2 mb-2" />
        
        <div className="flex justify-between items-center">
          <div className="text-sm">
            {progress}% of goal
          </div>
          <div className={cn(
            "flex items-center text-sm",
            isPositiveTrend ? "text-green-500" : "text-red-500"
          )}>
            {isPositiveTrend ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            {isPositiveTrend ? "+" : ""}{trend}% from last period
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface GoalTrackingProps {
  dateRange: DateRange | undefined;
}

const GoalTracking = ({ dateRange }: GoalTrackingProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <GoalCard
        title="Call Volume"
        description="Total calls made"
        current={173}
        target={200}
        unit=""
        icon={<Phone className="h-5 w-5 text-primary" />}
        trend={8}
      />
      
      <GoalCard
        title="Success Rate"
        description="Successful calls percentage"
        current={72}
        target={80}
        unit="%"
        icon={<Target className="h-5 w-5 text-primary" />}
        trend={5}
      />
      
      <GoalCard
        title="Avg. Call Duration"
        description="Average call length"
        current={7.5}
        target={10}
        unit=" min"
        icon={<Clock className="h-5 w-5 text-primary" />}
        trend={-3}
      />
      
      <GoalCard
        title="Conversion Rate"
        description="Lead to opportunity conversion"
        current={34}
        target={50}
        unit="%"
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
        trend={12}
      />
      
      <GoalCard
        title="Active Selling Days"
        description="Days with outbound calls"
        current={18}
        target={22}
        unit=""
        icon={<Calendar className="h-5 w-5 text-primary" />}
        trend={0}
      />
      
      <GoalCard
        title="Revenue Generated"
        description="Total revenue from calls"
        current={47500}
        target={75000}
        unit="$"
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        trend={15}
      />
      
      <GoalCard
        title="New Prospects"
        description="New qualified leads generated"
        current={45}
        target={60}
        unit=""
        icon={<Users className="h-5 w-5 text-primary" />}
        trend={7}
      />
    </div>
  );
};

export default GoalTracking;
