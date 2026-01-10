import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  ArrowLeftIcon,
  DeviceTabletIcon,
  MapPinIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

import StatusBadge from '../components/StatusBadge';
import { deviceAPI } from '../services/api';
import toast from 'react-hot-toast';

const DeviceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch device details
  const { data, isLoading, error, refetch } = useQuery(
    ['device', id],
    () => deviceAPI.getDevice(id),
    {
      refetchOnWindowFocus: false,
    }
  );

  const device = data?.data;
  console.log('DEBUG: Fetching device with ID:', data)
  const handleDelete = async () => {
    try {
      await deviceAPI.deleteDevice(id);
      toast.success('Device deleted successfully!');
      navigate('/devices');
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete device';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Error loading device details</div>
        <button
          onClick={() => refetch()}
          className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="text-center py-12">
        <DeviceTabletIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Device not found</h3>
        <p className="text-gray-500 mb-4">The requested device does not exist</p>
        <Link
          to="/devices"
          className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg inline-flex items-center"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Devices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link
            to="/devices"
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{device.name}</h1>
            <p className="text-gray-600 mt-1">Device Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to={`/devices/${device.id}/edit`}
            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </Link>
          <button
            onClick={() => setConfirmDelete(true)}
            className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Device Information */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          {/* Basic Information */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <DeviceTabletIcon className="h-6 w-6 text-gray-400 mr-3 mt-1" />
                <div>
                  <div className="text-sm text-gray-500">Device Name</div>
                  <div className="text-lg font-medium text-gray-900">{device.name}</div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="h-6 w-6 mr-3 mt-1"></div>
                <div>
                  <div className="text-sm text-gray-500">Hostname</div>
                  <div className="text-lg font-medium text-gray-900">{device.hostname}</div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="h-6 w-6 mr-3 mt-1"></div>
                <div>
                  <div className="text-sm text-gray-500">IP Address</div>
                  <div className="text-lg font-medium text-gray-900">{device.ip_address}</div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="h-6 w-6 mr-3 mt-1"></div>
                <div>
                  <div className="text-sm text-gray-500">Device Type</div>
                  <div className="text-lg font-medium text-gray-900 capitalize">{device.device_type.replace('_', ' ')}</div>
                </div>
              </div>

              <div className="flex items-start">
                <MapPinIcon className="h-6 w-6 text-gray-400 mr-3 mt-1" />
                <div>
                  <div className="text-sm text-gray-500">Location</div>
                  <div className="text-lg font-medium text-gray-900">{device.location || 'Not specified'}</div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="h-6 w-6 mr-3 mt-1"></div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="text-lg font-medium text-gray-900"><StatusBadge status={device.status} type="device" /></div>
                </div>
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <UserIcon className="h-6 w-6 text-gray-400 mr-3 mt-1" />
                <div>
                  <div className="text-sm text-gray-500">TACACS Username</div>
                  <div className="text-lg font-medium text-gray-900">{device.username}</div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="h-6 w-6 mr-3 mt-1"></div>
                <div>
                  <div className="text-sm text-gray-500">SSH Port</div>
                  <div className="text-lg font-medium text-gray-900">{device.ssh_port || 22}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Device Details */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Device Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-500">Vendor</div>
                <div className="text-lg font-medium text-gray-900">{device.vendor || 'Not specified'}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Model</div>
                <div className="text-lg font-medium text-gray-900">{device.model || 'Not specified'}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">OS Version</div>
                <div className="text-lg font-medium text-gray-900">{device.os_version || 'Not specified'}</div>
              </div>
            </div>

            {device.description && (
              <div className="mt-6">
                <div className="text-sm text-gray-500">Description</div>
                <div className="text-lg font-medium text-gray-900">{device.description}</div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-500">Created At</div>
                <div className="text-lg font-medium text-gray-900">{new Date(device.created_at).toLocaleString()}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Updated At</div>
                <div className="text-lg font-medium text-gray-900">{new Date(device.updated_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Device</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{device.name}"? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                Delete Device
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceView;