import React, { useState } from 'react';
import { useMetricsConsistencyLog, useMetricsAnomalyLog, useRunMetricsHealthChecks } from '../../hooks/useSupabase';

// Define interfaces for the data types
interface ConsistencyLogItem {
  metric_name: string;
  source_1: string;
  value_1: number | null;
  source_2: string;
  value_2: number | null;
  deviation_percentage: number | null;
  consistency_status: string;
}

interface AnomalyLogItem {
  metric_name: string;
  latest_value: number | null;
  average_value: number | null;
  deviation_percentage: number | null;
  severity: string;
  detection_time: string | null;
}

const MetricsDataQuality: React.FC = () => {
  const { data: consistencyLogData, loading: loadingConsistency, error: consistencyError, refetch: refetchConsistency } = useMetricsConsistencyLog();
  const { data: anomalyLogData, loading: loadingAnomalies, error: anomalyError, refetch: refetchAnomalies } = useMetricsAnomalyLog();
  const { runHealthChecks, running, lastRun, error: runError } = useRunMetricsHealthChecks();
  const [activeTab, setActiveTab] = useState('consistency');
  
  // Type assertions
  const consistencyLog = consistencyLogData as ConsistencyLogItem[] | null;
  const anomalyLog = anomalyLogData as AnomalyLogItem[] | null;

  const handleRunHealthChecks = async () => {
    await runHealthChecks();
    refetchConsistency();
    refetchAnomalies();
  };

  return (
    <div className="metrics-data-quality">
      <div className="header">
        <h1>Metrics Data Quality</h1>
        <div className="controls">
          <span className="last-run">
            {lastRun 
              ? `Last run: ${new Intl.DateTimeFormat('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'medium'
                }).format(lastRun)}`
              : 'Not run yet'}
          </span>
          <button 
            onClick={handleRunHealthChecks}
            disabled={running || loadingConsistency || loadingAnomalies}
            className="run-button"
          >
            {running ? 'Running...' : 'Run Health Checks'}
          </button>
        </div>
      </div>

      {runError && (
        <div className="error-message">
          <h3>Error Running Health Checks</h3>
          <p>{runError.message}</p>
        </div>
      )}

      <div className="tabs">
        <button 
          className={activeTab === 'consistency' ? 'active' : ''}
          onClick={() => setActiveTab('consistency')}
        >
          Consistency Checks
        </button>
        <button 
          className={activeTab === 'anomalies' ? 'active' : ''}
          onClick={() => setActiveTab('anomalies')}
        >
          Anomaly Detection
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'consistency' && (
          <div className="consistency-tab">
            <h2>Metrics Consistency Checks</h2>
            
            {consistencyError ? (
              <div className="error-message">
                <p>{consistencyError.message}</p>
                <button onClick={refetchConsistency}>Retry</button>
              </div>
            ) : loadingConsistency ? (
              <div className="loading">Loading consistency checks...</div>
            ) : !consistencyLog || consistencyLog.length === 0 ? (
              <div className="no-data">
                <p>No consistency checks have been run yet.</p>
                <button onClick={handleRunHealthChecks}>Run Checks Now</button>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Source 1</th>
                      <th>Value 1</th>
                      <th>Source 2</th>
                      <th>Value 2</th>
                      <th>Deviation</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consistencyLog.map((check, index) => (
                      <tr key={index} className={getStatusClass(check.consistency_status)}>
                        <td>{check.metric_name}</td>
                        <td>{check.source_1}</td>
                        <td>{formatValue(check.value_1)}</td>
                        <td>{check.source_2}</td>
                        <td>{formatValue(check.value_2)}</td>
                        <td>{formatDeviation(check.deviation_percentage)}%</td>
                        <td>{check.consistency_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="anomalies-tab">
            <h2>Metrics Anomaly Detection</h2>
            
            {anomalyError ? (
              <div className="error-message">
                <p>{anomalyError.message}</p>
                <button onClick={refetchAnomalies}>Retry</button>
              </div>
            ) : loadingAnomalies ? (
              <div className="loading">Loading anomaly detections...</div>
            ) : !anomalyLog || anomalyLog.length === 0 ? (
              <div className="no-data">
                <p>No anomalies have been detected yet.</p>
                <button onClick={handleRunHealthChecks}>Run Detection Now</button>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Latest Value</th>
                      <th>Average Value</th>
                      <th>Deviation</th>
                      <th>Severity</th>
                      <th>Detection Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalyLog.map((anomaly, index) => (
                      <tr key={index} className={getSeverityClass(anomaly.severity)}>
                        <td>{anomaly.metric_name}</td>
                        <td>{formatValue(anomaly.latest_value)}</td>
                        <td>{formatValue(anomaly.average_value)}</td>
                        <td>{formatDeviation(anomaly.deviation_percentage)}%</td>
                        <td>{anomaly.severity}</td>
                        <td>{formatTimestamp(anomaly.detection_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <style>
        {`
          .metrics-data-quality {
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
          
          .controls {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .last-run {
            font-size: 14px;
            color: #666;
          }
          
          .run-button {
            padding: 8px 16px;
            background-color: #6C63FF;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          
          .run-button:hover {
            background-color: #5A52D5;
          }
          
          .run-button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
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
          
          .loading, .no-data, .error-message {
            text-align: center;
            padding: 40px;
            color: #666;
            background-color: #f9f9f9;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          
          .error-message {
            color: #D32F2F;
            background-color: #FFEBEE;
          }
          
          .error-message button, .no-data button {
            margin-top: 15px;
            padding: 8px 16px;
            background-color: #4A90E2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          
          .error-message button {
            background-color: #D32F2F;
          }
          
          .data-table {
            overflow-x: auto;
            margin-bottom: 20px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          
          th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          
          th {
            background-color: #f8f8f8;
            font-weight: 600;
          }
          
          .status-good {
            background-color: rgba(76, 175, 80, 0.1);
          }
          
          .status-warning {
            background-color: rgba(255, 152, 0, 0.1);
          }
          
          .status-error {
            background-color: rgba(244, 67, 54, 0.1);
          }
          
          h1 {
            margin-top: 0;
            font-size: 24px;
            color: #333;
          }
          
          h2 {
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 20px;
            color: #333;
          }
        `}
      </style>
    </div>
  );
};

// Helper function to format numeric values
function formatValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    return value % 1 === 0 ? value.toString() : value.toFixed(2);
  }
  return value.toString();
}

// Helper function to format deviation percentages
function formatDeviation(deviation: any): string {
  if (deviation === null || deviation === undefined) return 'N/A';
  return typeof deviation === 'number' ? deviation.toFixed(2) : deviation.toString();
}

// Helper function to get CSS class based on status
function getStatusClass(status: string): string {
  if (!status) return '';
  
  switch (status.toLowerCase()) {
    case 'good':
      return 'status-good';
    case 'warning':
      return 'status-warning';
    case 'error':
      return 'status-error';
    default:
      return '';
  }
}

// Helper function to get CSS class based on severity
function getSeverityClass(severity: string): string {
  if (!severity) return '';
  
  switch (severity.toLowerCase()) {
    case 'normal':
      return 'status-good';
    case 'warning':
      return 'status-warning';
    case 'critical':
      return 'status-error';
    default:
      return '';
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

export default MetricsDataQuality; 