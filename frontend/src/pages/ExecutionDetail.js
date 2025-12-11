import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, PlayIcon } from '@heroicons/react/24/outline';

const ExecutionDetail = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link
          to="/executions"
          className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Execution Details</h1>
          <p className="text-gray-600 mt-1">Execution ID: {id}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12">
          <PlayIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Execution Detail Feature</h3>
          <p className="text-gray-500">This page is under construction. Execution detail functionality will be implemented here.</p>
        </div>
      </div>
    </div>
  );
};

export default ExecutionDetail;