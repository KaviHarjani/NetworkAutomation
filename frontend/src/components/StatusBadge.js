import React from 'react';

const StatusBadge = ({ status, type = 'execution' }) => {
  const getStatusConfig = (status, type) => {
    const configs = {
      execution: {
        pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
        running: { color: 'bg-blue-100 text-blue-800', label: 'Running' },
        completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
        failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
        cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
        rolling_back: { color: 'bg-orange-100 text-orange-800', label: 'Rolling Back' },
        rolled_back: { color: 'bg-gray-100 text-gray-800', label: 'Rolled Back' },
      },
      device: {
        online: { color: 'bg-green-100 text-green-800', label: 'Online' },
        offline: { color: 'bg-red-100 text-red-800', label: 'Offline' },
        maintenance: { color: 'bg-yellow-100 text-yellow-800', label: 'Maintenance' },
        unknown: { color: 'bg-gray-100 text-gray-800', label: 'Unknown' },
      },
      workflow: {
        draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
        active: { color: 'bg-green-100 text-green-800', label: 'Active' },
        paused: { color: 'bg-yellow-100 text-yellow-800', label: 'Paused' },
        archived: { color: 'bg-red-100 text-red-800', label: 'Archived' },
      },
    };

    return configs[type]?.[status] || { color: 'bg-gray-100 text-gray-800', label: status };
  };

  const config = getStatusConfig(status, type);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;