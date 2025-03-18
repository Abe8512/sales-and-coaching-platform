
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Mock data
const metrics = [
  { 
    id: 1, 
    metric: "Total Calls", 
    daily: 15, 
    weekly: 76, 
    monthly: 315, 
    trend: 8,
    benchmark: 300,
    status: "above"
  },
  { 
    id: 2, 
    metric: "Avg Call Duration", 
    daily: "8.2 min", 
    weekly: "7.5 min", 
    monthly: "7.8 min", 
    trend: 2,
    benchmark: "8.0 min",
    status: "on-track"
  },
  { 
    id: 3, 
    metric: "Success Rate", 
    daily: "65%", 
    weekly: "72%", 
    monthly: "68%", 
    trend: 5,
    benchmark: "70%",
    status: "on-track"
  },
  { 
    id: 4, 
    metric: "Conversion Rate", 
    daily: "22%", 
    weekly: "34%", 
    monthly: "32%", 
    trend: 12,
    benchmark: "40%",
    status: "below"
  },
  { 
    id: 5, 
    metric: "Talk-to-Listen Ratio", 
    daily: "45:55", 
    weekly: "42:58", 
    monthly: "44:56", 
    trend: -3,
    benchmark: "40:60",
    status: "below"
  },
  { 
    id: 6, 
    metric: "First Response Time", 
    daily: "1.2s", 
    weekly: "1.5s", 
    monthly: "1.3s", 
    trend: -5,
    benchmark: "1.0s",
    status: "below"
  },
  { 
    id: 7, 
    metric: "Questions Asked", 
    daily: 12, 
    weekly: 11, 
    monthly: 12, 
    trend: 8,
    benchmark: 15,
    status: "below"
  },
  { 
    id: 8, 
    metric: "Objections Handled", 
    daily: 5, 
    weekly: 6, 
    monthly: 5, 
    trend: 10,
    benchmark: 5,
    status: "above"
  },
  { 
    id: 9, 
    metric: "Follow-up Rate", 
    daily: "80%", 
    weekly: "75%", 
    monthly: "78%", 
    trend: 4,
    benchmark: "85%",
    status: "below"
  },
  { 
    id: 10, 
    metric: "Client Satisfaction", 
    daily: "4.5/5", 
    weekly: "4.3/5", 
    monthly: "4.4/5", 
    trend: 2,
    benchmark: "4.5/5",
    status: "on-track"
  },
];

type SortKey = "metric" | "daily" | "weekly" | "monthly" | "trend" | "benchmark" | "status";
type SortDirection = "asc" | "desc";

interface KeyMetricsTableProps {
  dateRange: DateRange | undefined;
}

const KeyMetricsTable = ({ dateRange }: KeyMetricsTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>("metric");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };
  
  const sortedMetrics = [...metrics]
    .filter(metric => metric.metric.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortDirection === "asc") {
        return a[sortKey] > b[sortKey] ? 1 : -1;
      } else {
        return a[sortKey] < b[sortKey] ? 1 : -1;
      }
    });
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "above":
        return "text-green-500";
      case "on-track":
        return "text-amber-500";
      case "below":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Key Performance Metrics</CardTitle>
            <CardDescription>
              Detailed breakdown of all tracked metrics
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Input 
              placeholder="Search metrics..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-[250px]"
            />
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("metric")}
                >
                  <div className="flex items-center">
                    Metric
                    {sortKey === "metric" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-1 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("daily")}
                >
                  <div className="flex items-center">
                    Daily
                    {sortKey === "daily" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-1 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("weekly")}
                >
                  <div className="flex items-center">
                    Weekly
                    {sortKey === "weekly" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-1 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("monthly")}
                >
                  <div className="flex items-center">
                    Monthly
                    {sortKey === "monthly" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-1 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("trend")}
                >
                  <div className="flex items-center">
                    Trend
                    {sortKey === "trend" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-1 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("benchmark")}
                >
                  <div className="flex items-center">
                    Benchmark
                    {sortKey === "benchmark" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-1 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    {sortKey === "status" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-1 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMetrics.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><strong>{item.metric}</strong></TableCell>
                  <TableCell>{item.daily}</TableCell>
                  <TableCell>{item.weekly}</TableCell>
                  <TableCell>{item.monthly}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {item.trend >= 0 ? (
                        <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
                      )}
                      <span className={item.trend >= 0 ? "text-green-500" : "text-red-500"}>
                        {item.trend >= 0 ? "+" : ""}{item.trend}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{item.benchmark}</TableCell>
                  <TableCell>
                    <span className={getStatusColor(item.status)}>
                      {item.status === "above" && "Above Target"}
                      {item.status === "on-track" && "On Track"}
                      {item.status === "below" && "Below Target"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default KeyMetricsTable;
