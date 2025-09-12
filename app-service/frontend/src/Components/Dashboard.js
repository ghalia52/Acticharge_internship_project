import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Battery, Zap, TrendingUp, AlertCircle, Clock, User, LogOut } from 'lucide-react';
import '../app.css'; 

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [chargingData, setChargingData] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // User state
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    fullName: ''
  });
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://acticharge-drh3g9afcng6ckgw.francecentral-01.azurewebsites.net';

  useEffect(() => {
    // Get user data from sessionStorage
    const userData = sessionStorage.getItem('user');
    console.log('Raw user data from sessionStorage:', userData); 
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('Parsed user data:', parsedUser); 
        
        const firstName = parsedUser.firstName || 
                         parsedUser.first_name || 
                         parsedUser.name?.split(' ')[0] || 
                         parsedUser.username || 
                         '';
        
        const lastName = parsedUser.lastName || 
                        parsedUser.last_name || 
                        parsedUser.name?.split(' ').slice(1).join(' ') || 
                        '';
        
        const email = parsedUser.email || '';
        
        // Create full name
        const fullName = `${firstName} ${lastName}`.trim() || 
                        parsedUser.name || 
                        parsedUser.username || 
                        'User';
        
        setUser({
          firstName,
          lastName,
          email,
          fullName
        });
        
        console.log('Set user state:', { firstName, lastName, email, fullName }); // Debug log
        
      } catch (error) {
        console.error('Error parsing user data:', error);
        // If there's an error parsing user data, set default values
        setUser({
          firstName: '',
          lastName: '',
          email: '',
          fullName: 'User'
        });
      }
    } else {
      // No user data found, set default values
      console.warn('No user data found in sessionStorage');
      setUser({
        firstName: '',
        lastName: '',
        email: '',
        fullName: 'User'
      });
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching data from backend...");
        
        const healthCheck = await fetch(`${API_BASE_URL}/`);
        if (!healthCheck.ok) {
          throw new Error(`Backend not responding. Make sure your server is running on port 5000`);
        }
        
        // Fetch charging sessions data using correct backend routes
        console.log("Fetching charging data...");
        const chargingRes = await fetch(`${API_BASE_URL}/api/charging`);
        if (!chargingRes.ok) {
          throw new Error(`Charging data error! status: ${chargingRes.status} - ${chargingRes.statusText}`);
        }
        const chargingData = await chargingRes.json();
        console.log("Charging data received:", chargingData.length, "records");
        setChargingData(chargingData);

        // Fetch predictions data using correct backend routes
        console.log("Fetching predictions data...");
        const predictionsRes = await fetch(`${API_BASE_URL}/api/predictions`);
        if (!predictionsRes.ok) {
          throw new Error(`Predictions data error! status: ${predictionsRes.status} - ${predictionsRes.statusText}`);
        }
        const predictionsData = await predictionsRes.json();
        console.log("Predictions data received:", predictionsData.length, "records");
        setPredictions(predictionsData);

        console.log("All data fetched successfully!");
      } catch (error) {
        console.error("Error fetching data:", error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          setError("Cannot connect to backend server. Please ensure your Express server is running on port 5000 and CORS is enabled.");
        } else {
          setError(error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle sign out
  const handleSignOut = () => {
    // Clear user data from sessionStorage
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('rememberedEmail');
    
    // Redirect to login page or refresh
    window.location.href = '/login'; // Replace with your login route
  };

  // Process charging data for charts
  const processedChargingData = chargingData.map((item, index) => ({
    session: `Session ${index + 1}`,
    time: `${Math.floor(item.connectionTime_decimal)}:${String(Math.floor((item.connectionTime_decimal % 1) * 60)).padStart(2, '0')}`,
    kWhDelivered: item.kWhDelivered,
    duration: item.chargingDuration,
    dayIndicator: item.dayIndicator,
    avgPower: item.chargingDuration > 0 ? item.kWhDelivered / item.chargingDuration : 0
  }));

  // Create hourly distribution data
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const sessionsInHour = chargingData.filter(item => 
      Math.floor(item.connectionTime_decimal) === hour
    );
    return {
      hour: `${hour}:00`,
      sessions: sessionsInHour.length,
      totalEnergy: sessionsInHour.reduce((sum, item) => sum + item.kWhDelivered, 0)
    };
  }).filter(d => d.sessions > 0);

  // Calculate statistics from actual data
  const totalEnergyDelivered = chargingData.reduce((sum, item) => sum + item.kWhDelivered, 0);
  const totalSessions = chargingData.length;
  const avgSessionDuration = totalSessions > 0 
    ? chargingData.reduce((sum, item) => sum + item.chargingDuration, 0) / totalSessions 
    : 0;
  const avgPowerDelivered = totalSessions > 0 
    ? chargingData.reduce((sum, item) => sum + (item.chargingDuration > 0 ? item.kWhDelivered / item.chargingDuration : 0), 0) / totalSessions 
    : 0;

  // Find peak hour from actual data
  const peakHour = hourlyData.length > 0 
    ? hourlyData.reduce((max, current) => current.sessions > max.sessions ? current : max)
    : { hour: 'N/A', sessions: 0 };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'analytics', label: 'Analytics', icon: Battery },
    { id: 'predictions', label: 'Predictions', icon: Zap },
    { id: 'alerts', label: 'Alerts', icon: AlertCircle }
  ];

  const StatCard = ({ title, value, unit, icon: Icon }) => (
    <div className="stat-card">
      <div className="stat-card-content">
        <div>
          <p className="stat-card-title">{title}</p>
          <p className="stat-card-value">
            {value} <span className="stat-card-unit">{unit}</span>
          </p>
        </div>
        <Icon className="stat-card-icon" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <AlertCircle className="error-icon" />
          <h2 className="error-title">Error Loading Data</h2>
          <p className="error-message">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="stats-grid">
        <StatCard 
          title="Total Energy Delivered" 
          value={totalEnergyDelivered.toFixed(1)} 
          unit="kWh" 
          icon={Battery} 
        />
        <StatCard 
          title="Total Sessions" 
          value={totalSessions} 
          unit="sessions" 
          icon={Zap} 
        />
        <StatCard 
          title="Avg Session Duration" 
          value={avgSessionDuration.toFixed(1)} 
          unit="hours" 
          icon={Clock} 
        />
      </div>
      
      <div className="charts-grid">
        <div className="chart-container">
          <h3 className="chart-title">Energy Delivered by Session</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={processedChargingData.slice(0, 20)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session" />
              <YAxis />
              <Tooltip formatter={(value) => [value.toFixed(2), 'kWh Delivered']} />
              <Bar dataKey="kWhDelivered" fill="#10B981" name="Energy Delivered" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container">
          <h3 className="chart-title">Hourly Session Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sessions" stroke="#10B981" strokeWidth={2} name="Sessions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="chart-container">
        <h3 className="chart-title">Charging Duration vs Energy Delivered (Last 100 Sessions)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={processedChargingData.slice(-100)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="duration" type="number" domain={['dataMin', 'dataMax']} />
            <YAxis />
            <Tooltip formatter={(value, name) => [value.toFixed(2), name === 'kWhDelivered' ? 'kWh Delivered' : name]} />
            <Line type="monotone" dataKey="kWhDelivered" stroke="#10B981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4 className="analytics-card-title">Peak Hours</h4>
          <p className="analytics-card-value">{peakHour.hour}</p>
          <p className="analytics-card-subtitle">{peakHour.sessions} sessions</p>
        </div>
        <div className="analytics-card">
          <h4 className="analytics-card-title">Active Sessions</h4>
          <p className="analytics-card-value">{totalSessions}</p>
          <p className="analytics-card-subtitle">Total recorded</p>
        </div>
        <div className="analytics-card">
          <h4 className="analytics-card-title">Avg Power per Session</h4>
          <p className="analytics-card-value">{avgPowerDelivered.toFixed(1)} kW</p>
          <p className="analytics-card-subtitle">System average</p>
        </div>
      </div>

      <div className="chart-container">
        <h3 className="chart-title">Recent Charging Sessions </h3>
        <div className="table-container">
          <table className="data-table">
            <thead className="table-header">
              <tr>
                <th>Session</th>
                <th>Start Time</th>
                <th>Duration (hrs)</th>
                <th>Energy (kWh)</th>
                <th>Day Type</th>
                <th>Avg Power (kW)</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {processedChargingData.slice(-10).map((session, index) => (
                <tr key={index}>
                  <td className="table-cell-primary">{session.session}</td>
                  <td className="table-cell-secondary">{session.time}</td>
                  <td className="table-cell-secondary">{session.duration.toFixed(2)}</td>
                  <td className="table-cell-secondary">{session.kWhDelivered.toFixed(2)}</td>
                  <td className="table-cell-secondary">{session.dayIndicator}</td>
                  <td className="table-cell-secondary">{session.avgPower.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPredictions = () => (
    <div className="space-y-6">
      <div className="chart-container">
        <h3 className="chart-title">Energy Consumption Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={processedChargingData.slice(-20)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="kWhDelivered" stroke="#10B981" strokeWidth={2} name="Energy Demand" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="predictions-grid">
        <div className="chart-container">
          <h4 className="chart-title">Predictions</h4>
          <div className="space-y-3">
            {predictions.length > 0 ? (
               predictions.slice(-5).map((prediction, index) => (
                  <div key={index} className="prediction-item">
                  <div>
                    <span className="prediction-time">Connection Time:</span>
                    <span className="prediction-time-value">{Math.floor(prediction.connectionTime_decimal)}:00</span>
                  </div>
                  <div className="prediction-value">
                    <div className="prediction-kwh">
                      {prediction.predicted_kWh ? `${prediction.predicted_kWh.toFixed(1)} kWh` : 'N/A'}
                    </div>
                    <div className="prediction-day">{prediction.dayIndicator}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="table-cell-secondary">No predictions available</p>
            )}
          </div>
        </div>
        
        <div className="chart-container">
          <h4 className="chart-title">System Metrics</h4>
          <div className="space-y-3">
            <div className="metric-item">
              <span className="metric-label">Total Sessions:</span>
              <span className="metric-value">{totalSessions}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Total Predictions:</span>
              <span className="metric-value">{predictions.length}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Avg Session Duration:</span>
              <span className="metric-value">{avgSessionDuration.toFixed(1)} hrs</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Data Collection:</span>
              <span className="metric-value active">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="space-y-6">
      <div className="chart-container">
        <h3 className="chart-title">System Status</h3>
        <div className="space-y-4">
          {totalEnergyDelivered > 1000 && (
            <div className="alert alert-warning">
              <div className="alert-content">
                <AlertCircle className="alert-icon warning" />
                <div>
                  <h4 className="alert-title warning">High Energy Consumption</h4>
                  <p className="alert-message warning">
                    Total energy consumption: {totalEnergyDelivered.toFixed(1)} kWh
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {avgSessionDuration > 5 && (
            <div className="alert alert-warning">
              <div className="alert-content">
                <AlertCircle className="alert-icon warning" />
                <div>
                  <h4 className="alert-title warning">Extended Session Duration</h4>
                  <p className="alert-message warning">
                    Average session duration: {avgSessionDuration.toFixed(1)} hours
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="alert alert-success">
            <div className="alert-content">
              <AlertCircle className="alert-icon success" />
              <div>
                <h4 className="alert-title success">System Operational</h4>
                <p className="alert-message success">
                  Successfully processed {totalSessions} charging sessions
                </p>
              </div>
            </div>
          </div>

          <div className="alert alert-info">
            <div className="alert-content">
              <AlertCircle className="alert-icon info" />
              <div>
                <h4 className="alert-title info">Data Status</h4>
                <p className="alert-message info">
                  Charging data: {chargingData.length} records | Predictions: {predictions.length} records
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'overview':
        return renderOverview();
      case 'analytics':
        return renderAnalytics();
      case 'predictions':
        return renderPredictions();
      case 'alerts':
        return renderAlerts();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">
            <img src="/act_logo.png" alt="Logo" className="logo-icon" />
            ActiCharge
          </h1>
        </div>
        
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-button ${
                  activeTab === item.id 
                    ? 'active' 
                    : 'inactive'
                }`}
              >
                <Icon className="nav-icon" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="sidebar-footer">
          <button onClick={handleSignOut} className="signout-button">
            <LogOut className="nav-icon" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header with Profile */}
        <div className="top-header">
          <div className="profile-section">
            <div className="profile-info">
              <span className="profile-name">
                {user.fullName || `${user.firstName} ${user.lastName}`.trim() || 'User'}
              </span>
              <span className="profile-email">{user.email || 'No email available'}</span>
            </div>
            <div className="profile-avatar">
              <User className="profile-icon" />
            </div>
          </div>
        </div>

        <div className="content-wrapper">
          <div className="page-header">
            <h2 className="page-title">{activeTab}</h2>
            <p className="page-subtitle">EV charging infrastructure insights and analytics</p>
          </div>
          
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;