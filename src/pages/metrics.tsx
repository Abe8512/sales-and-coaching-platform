import React, { useState } from 'react';
import MetricsDashboard from '../components/Metrics/MetricsDashboard';
import MetricsDataQuality from '../components/Metrics/MetricsDataQuality';

const MetricsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeFrame, setTimeFrame] = useState('30days');

  return (
    <div className="metrics-page">
      <div className="header">
        <h1>Future Sentiment Analytics</h1>
        <div className="time-frame-selector">
          <label htmlFor="time-frame">Time Frame:</label>
          <select 
            id="time-frame" 
            value={timeFrame} 
            onChange={(e) => setTimeFrame(e.target.value)}
            className="time-frame-select"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Metrics Dashboard
        </button>
        {/* Comment out Data Quality Tab Button */}
        {/* 
        <button 
          className={activeTab === 'data-quality' ? 'active' : ''} 
          onClick={() => setActiveTab('data-quality')}
        >
          Data Quality
        </button> 
        */}
      </div>

      <div className="tab-content">
        {activeTab === 'dashboard' && <MetricsDashboard timeFrame={timeFrame} />}
        {/* Comment out Data Quality Component */}
        {/* {activeTab === 'data-quality' && <MetricsDataQuality />} */}
      </div>

      <style>
        {`
          .metrics-page {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          
          h1 {
            margin: 0;
            font-size: 28px;
            color: #2d3748;
          }
          
          .time-frame-selector {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .time-frame-select {
            padding: 8px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            background-color: white;
            font-size: 14px;
            min-width: 150px;
          }
          
          .tabs {
            display: flex;
            gap: 2px;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
          }
          
          .tabs button {
            padding: 10px 20px;
            background-color: #f8f8f8;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.2s;
          }
          
          .tabs button:hover {
            background-color: #f0f0f0;
          }
          
          .tabs button.active {
            border-bottom: 3px solid #4A90E2;
            font-weight: bold;
          }
        `}
      </style>
    </div>
  );
};

export default MetricsPage; 