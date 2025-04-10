import React, { useState } from 'react';
import { useDashboardMetrics, useRefreshMetrics } from '../../hooks/useSupabase';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// Define an interface for the metrics data structure (based on dashboard_metrics_mv)
// Adjust this based on the actual structure returned by your materialized view
interface DashboardMetrics {
  time_frame: string;
  avg_performance_score: number | null;
  total_calls: number | null;
  avg_sentiment: number | null;
  conversion_rate: number | null;
  performance_trend: { date: string; score: number }[] | null;
  avg_rep_talk_time: number | null;
  avg_customer_talk_time: number | null;
  avg_silence_time: number | null;
  call_volume_by_day: { day: string; count: number }[] | null;
  sentiment_distribution: { range: string; count: number }[] | null;
  avg_talk_ratio: number | null;
  avg_call_duration: number | null;
  avg_longest_monologue: number | null;
  avg_interactivity: number | null;
  performance_by_rep: { rep_id: string; rep_name: string; score: number }[] | null;
  avg_questions_rate: number | null; // Added based on performance chart usage
  calls_today: number | null;
  calls_this_week: number | null;
  calls_this_month: number | null;
  call_growth_rate: number | null;
  call_volume_trend: { date: string; count: number }[] | null;
  call_duration_distribution: { range: string; count: number }[] | null;
  top_reps: { rep_id: string; rep_name: string; performance_score: number }[] | null;
  hourly_call_distribution: { hour: string; count: number }[] | null;
  data_completeness: number | null;
  missing_transcripts: number | null;
  metrics_confidence: number | null;
  data_inconsistencies: number | null;
  transcript_completeness_status: string | null;
  sentiment_analysis_status: string | null;
  talk_ratio_status: string | null;
  overall_data_quality_status: string | null;
  sentiment_coverage: number | null;
  talk_ratio_coverage: number | null;
  data_quality_score: number | null;
  metrics_version: string | null;
  last_metrics_update: string | null;
}

interface MetricsDashboardProps {
  timeFrame?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ 
  timeFrame = '30days'
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  // Use the specific type for the data hook
  const { data: metricsData, loading, error, refetch } = useDashboardMetrics(timeFrame);
  const { refreshMetrics, refreshing, lastRefreshed } = useRefreshMetrics();

  // Type assertion
  const metrics = metricsData as DashboardMetrics | null;

  const handleRefresh = async () => {
    await refreshMetrics(false);
    refetch();
  };

  const handleFullRefresh = async () => {
    await refreshMetrics(true);
    refetch();
  };

  if (error) {
    return (
      <div className="metrics-error">
        <h2>Error Loading Metrics</h2>
        <p>{error.message}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  const formattedLastRefreshed = lastRefreshed 
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium'
      }).format(lastRefreshed)
    : 'Never';

  return (
    <div className="metrics-dashboard">
      <div className="dashboard-header">
        <h1>Metrics Dashboard</h1>
        <div className="refresh-controls">
          <span className="last-refreshed">
            Last refreshed: {formattedLastRefreshed}
          </span>
          <button 
            onClick={handleRefresh} 
            disabled={refreshing || loading}
            className="refresh-button"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
          </button>
          <button 
            onClick={handleFullRefresh} 
            disabled={refreshing || loading}
            className="full-refresh-button"
          >
            Full Refresh
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'performance' ? 'active' : ''} 
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
        <button 
          className={activeTab === 'call-activity' ? 'active' : ''} 
          onClick={() => setActiveTab('call-activity')}
        >
          Call Activity
        </button>
        <button 
          className={activeTab === 'data-quality' ? 'active' : ''} 
          onClick={() => setActiveTab('data-quality')}
        >
          Data Quality
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading metrics data...</div>
      ) : !metrics ? (
        <div className="no-data">No metrics data available for the selected timeframe.</div>
      ) : (
        <div className="dashboard-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="metrics-cards">
                <MetricCard title="Performance Score" value={(metrics.avg_performance_score || 0).toFixed(1)} description="Average performance score across all calls" />
                <MetricCard title="Total Calls" value={metrics.total_calls || 0} description="Total number of calls analyzed" />
                <MetricCard title="Average Sentiment" value={(metrics.avg_sentiment || 0).toFixed(2)} description="Average sentiment score (-1 to 1)" />
                <MetricCard title="Conversion Rate" value={`${((metrics.conversion_rate || 0) * 100).toFixed(1)}%`} description="Percentage of calls resulting in conversion" />
              </div>

              <div className="chart-row">
                <ChartContainer title="Performance Trend">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.performance_trend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="#8884d8" activeDot={{ r: 8 }} name="Perf. Score" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                <ChartContainer title="Talk Ratio Distribution">
                   <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Rep Talk', value: metrics.avg_rep_talk_time || 0 },
                          { name: 'Customer Talk', value: metrics.avg_customer_talk_time || 0 },
                          { name: 'Silence', value: metrics.avg_silence_time || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: 'Rep Talk Time', value: metrics.avg_rep_talk_time || 0 },
                          { name: 'Customer Talk Time', value: metrics.avg_customer_talk_time || 0 },
                          { name: 'Silence', value: metrics.avg_silence_time || 0 }
                        ].filter(d => d.value > 0) // Filter out zero values for cell generation
                         .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${formatDuration(value)}`}/>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              <div className="chart-row">
                 <ChartContainer title="Call Volume by Day">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.call_volume_by_day || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Calls"/>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>

                 <ChartContainer title="Sentiment Distribution">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.sentiment_distribution || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#82ca9d" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
             <div className="performance-tab">
              <div className="metrics-cards">
                 <MetricCard title="Avg Talk Ratio" value={`${((metrics.avg_talk_ratio || 0) * 100).toFixed(1)}%`} description="Avg ratio of rep talk time" />
                 <MetricCard title="Avg Call Duration" value={formatDuration(metrics.avg_call_duration || 0)} description="Average duration of calls" />
                 <MetricCard title="Longest Monologue" value={formatDuration(metrics.avg_longest_monologue || 0)} description="Avg longest continuous speaking time" />
                 <MetricCard title="Interactivity Score" value={(metrics.avg_interactivity || 0).toFixed(1)} description="Avg measure of back-and-forth" />
              </div>

              <div className="chart-row">
                 <ChartContainer title="Performance by Rep">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      layout="vertical" 
                      data={metrics.performance_by_rep || []}
                      margin={{ top: 5, right: 30, left: 60, bottom: 5 }} // Adjust left margin for rep names
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="rep_name" width={100} interval={0} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="score" fill="#8884d8" name="Perf. Score"/>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>

                 <ChartContainer title="Performance Metrics Comparison">
                   <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={[
                      { name: 'Talk Ratio', actual: (metrics.avg_talk_ratio || 0) * 100, target: 40 },
                      { name: 'Sentiment', actual: (metrics.avg_sentiment || 0) * 100, target: 30 },
                      { name: 'Questions Rate', actual: (metrics.avg_questions_rate || 0) * 100, target: 15 },
                      { name: 'Interactivity', actual: (metrics.avg_interactivity || 0) * 10, target: 80 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => value.toFixed(1)} />
                      <Legend />
                      <Bar dataKey="actual" fill="#8884d8" name="Actual" />
                      <Bar dataKey="target" fill="#82ca9d" name="Target" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          )}

          {/* Call Activity Tab */}
          {activeTab === 'call-activity' && (
             <div className="call-activity-tab">
              <div className="metrics-cards">
                 <MetricCard title="Calls Today" value={metrics.calls_today || 0} description="Total calls recorded today" />
                 <MetricCard title="Calls This Week" value={metrics.calls_this_week || 0} description="Total calls for current week" />
                 <MetricCard title="Calls This Month" value={metrics.calls_this_month || 0} description="Total calls for current month" />
                 <MetricCard title="Call Growth" value={`${((metrics.call_growth_rate || 0) * 100).toFixed(1)}%`} description="Volume growth vs previous period" />
              </div>

              <div className="chart-row">
                 <ChartContainer title="Call Volume Trend">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.call_volume_trend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} name="Calls"/>
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                 <ChartContainer title="Call Duration Distribution">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.call_duration_distribution || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#82ca9d" name="Count"/>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              <div className="chart-row">
                 <ChartContainer title="Top Performing Representatives">
                   <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      layout="vertical" 
                      data={(metrics.top_reps || []).slice(0, 5)}
                      margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="rep_name" width={100} interval={0}/>
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="performance_score" fill="#8884d8" name="Performance Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>

                 <ChartContainer title="Hourly Call Distribution">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.hourly_call_distribution || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Calls"/>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          )}

          {/* Data Quality Tab */}
          {activeTab === 'data-quality' && (
            <div className="data-quality-tab">
               <div className="metrics-cards">
                 <MetricCard title="Data Completeness" value={`${((metrics.data_completeness || 0) * 100).toFixed(1)}%`} description="% of calls with complete data" />
                 <MetricCard title="Missing Transcripts" value={metrics.missing_transcripts || 0} description="Calls with missing transcripts" />
                 <MetricCard title="Metrics Confidence" value={`${((metrics.metrics_confidence || 0) * 100).toFixed(1)}%`} description="Overall confidence in metrics" />
                 <MetricCard title="Data Inconsistencies" value={metrics.data_inconsistencies || 0} description="Identified data inconsistencies" />
              </div>

              <div className="data-quality-section">
                <h3>Data Quality Report</h3>
                <div className="quality-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Status</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Transcript Completeness</td>
                        <td className={getStatusClass(metrics.transcript_completeness_status)}>
                          {metrics.transcript_completeness_status || 'Unknown'}
                        </td>
                        <td>
                          {metrics.missing_transcripts || 0} calls missing transcripts out of {metrics.total_calls || 0} total
                        </td>
                      </tr>
                      <tr>
                        <td>Sentiment Analysis</td>
                        <td className={getStatusClass(metrics.sentiment_analysis_status)}>
                          {metrics.sentiment_analysis_status || 'Unknown'}
                        </td>
                        <td>
                          Sentiment scores available for {((metrics.sentiment_coverage || 0) * 100).toFixed(1)}% of calls
                        </td>
                      </tr>
                      <tr>
                        <td>Talk Ratio Analysis</td>
                        <td className={getStatusClass(metrics.talk_ratio_status)}>
                          {metrics.talk_ratio_status || 'Unknown'}
                        </td>
                        <td>
                          Talk ratio data available for {((metrics.talk_ratio_coverage || 0) * 100).toFixed(1)}% of calls
                        </td>
                      </tr>
                      <tr>
                        <td>Overall Data Quality</td>
                        <td className={getStatusClass(metrics.overall_data_quality_status)}>
                          {metrics.overall_data_quality_status || 'Unknown'}
                        </td>
                        <td>
                          Overall data quality score: {((metrics.data_quality_score || 0) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="data-quality-section">
                <h3>Metrics Version Information</h3>
                <div className="version-info">
                  <p><strong>Current Metrics Version:</strong> {metrics.metrics_version || 'Unknown'}</p>
                  <p><strong>Last Updated:</strong> {formatTimestamp(metrics.last_metrics_update)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>
        {`
          .metrics-dashboard {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          
          .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          
          .refresh-controls {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .last-refreshed {
            font-size: 14px;
            color: #666;
          }
          
          .refresh-button, .full-refresh-button {
            padding: 8px 16px;
            background-color: #4A90E2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          
          .refresh-button:hover, .full-refresh-button:hover {
            background-color: #357ABD;
          }
          
          .refresh-button:disabled, .full-refresh-button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
          }
          
          .full-refresh-button {
            background-color: #6C63FF;
          }
          
          .full-refresh-button:hover {
            background-color: #5A52D5;
          }
          
          .dashboard-tabs {
            display: flex;
            gap: 2px;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
          }
          
          .dashboard-tabs button {
            padding: 10px 20px;
            background-color: #f8f8f8;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.2s;
          }
          
          .dashboard-tabs button:hover {
            background-color: #f0f0f0;
          }
          
          .dashboard-tabs button.active {
            border-bottom: 3px solid #4A90E2;
            font-weight: bold;
          }
          
          .loading-state, .no-data, .metrics-error {
            text-align: center;
            padding: 40px;
            color: #666;
            background-color: #f9f9f9;
            border-radius: 8px;
          }
          
          .metrics-error {
            color: #D32F2F;
            background-color: #FFEBEE;
          }
          
          .metrics-error button {
            margin-top: 15px;
            padding: 8px 16px;
            background-color: #D32F2F;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          
          pre {
            background-color: #f8f8f8;
            padding: 15px;
            border-radius: 4px;
            overflow: auto;
            font-size: 14px;
            border: 1px solid #ddd;
          }
          
          h2 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 24px;
            color: #333;
          }
          
          p {
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 16px;
            color: #666;
          }
          
          .metrics-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .metric-card {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 20px;
            text-align: center;
          }
          
          .metric-card h3 {
            margin-top: 0;
            font-size: 16px;
            color: #555;
          }
          
          .metric-value {
            font-size: 28px;
            font-weight: bold;
            margin: 10px 0;
            color: #333;
          }
          
          .metric-description {
            font-size: 14px;
            color: #777;
          }

          .chart-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          
          @media (max-width: 768px) {
            .chart-row {
              grid-template-columns: 1fr;
            }
          }
          
          .chart-container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 20px;
            height: 100%; /* Ensure container takes full height */
          }
          
          .chart-container h3 {
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 18px;
            color: #333;
          }

          .data-quality-section {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 20px;
          }
          
          .data-quality-section h3 {
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 18px;
            color: #333;
          }
          
          .quality-table {
            overflow-x: auto;
          }
          
          .quality-table table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .quality-table th, .quality-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          
          .quality-table th {
            background-color: #f8f8f8;
            font-weight: 600;
          }
          
          .status-good {
            color: #4CAF50;
            font-weight: bold;
          }
          
          .status-warning {
            color: #FF9800;
            font-weight: bold;
          }
          
          .status-error {
            color: #F44336;
            font-weight: bold;
          }
          
          .version-info {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
          }
          
          .version-info p {
            margin: 0;
          }
        `}
      </style>
    </div>
  );
};

// Helper Component: MetricCard
interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
}
const MetricCard: React.FC<MetricCardProps> = ({ title, value, description }) => (
  <div className="metric-card">
    <h3>{title}</h3>
    <div className="metric-value">{value}</div>
    <div className="metric-description">{description}</div>
  </div>
);

// Helper Component: ChartContainer
interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
}
const ChartContainer: React.FC<ChartContainerProps> = ({ title, children }) => (
  <div className="chart-container">
    <h3>{title}</h3>
    {children}
  </div>
);

// Helper function to format duration in seconds to M:SS
function formatDuration(seconds: number | null): string {
  if (seconds === null || isNaN(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Helper function to get status class
function getStatusClass(status: string | null): string {
  if (!status) return '';
  switch (status.toLowerCase()) {
    case 'good': return 'status-good';
    case 'warning': return 'status-warning';
    case 'error': return 'status-error';
    default: return '';
  }
}

// Helper function to format timestamps
function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  } catch (e) {
    return timestamp;
  }
}

export default MetricsDashboard; 