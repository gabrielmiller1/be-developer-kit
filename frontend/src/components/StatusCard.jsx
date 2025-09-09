import React from 'react';

const StatusCard = ({ title, value, icon, color = 'blue' }) => {
  return (
    <div className={`status-card status-card-${color}`}>
      <div className="status-card-header">
        <span className="status-card-icon">{icon}</span>
        <h3 className="status-card-title">{title}</h3>
      </div>
      <div className="status-card-content">
        <div className="status-card-value">{value}</div>
      </div>
      <div className="status-card-gradient"></div>
    </div>
  );
};

export default StatusCard;
