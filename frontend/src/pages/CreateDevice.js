import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from 'react-query';
import {
  ArrowLeftIcon,
  DeviceTabletIcon,
} from '@heroicons/react/24/outline';

import { deviceAPI } from '../services/api';
import toast from 'react-hot-toast';

const CreateDevice = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    ip_address: '',
    device_type: 'router',
    username: '',
    ssh_port: 22,
    vendor: '',
    model: '',
    os_version: '',
    location: '',
    description: '',
  });

  const createDeviceMutation = useMutation(deviceAPI.createDevice, {
    onSuccess: () => {
      toast.success('Device created successfully!');
      navigate('/devices');
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Failed to create device';
      toast.error(message);
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'ssh_port' ? parseInt(value) || 22 : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.hostname || !formData.ip_address || 
        !formData.username) {
      toast.error('Please fill in all required fields');
      return;
    }

    createDeviceMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center">
        <Link
          to="/devices"
          className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Device</h1>
          <p className="text-gray-600 mt-1">Configure a new network device for automation</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Device Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Router-01"
                />
              </div>

              <div>
                <label htmlFor="hostname" className="block text-sm font-medium text-gray-700 mb-2">
                  Hostname *
                </label>
                <input
                  type="text"
                  id="hostname"
                  name="hostname"
                  required
                  value={formData.hostname}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., router01.example.com"
                />
              </div>

              <div>
                <label htmlFor="ip_address" className="block text-sm font-medium text-gray-700 mb-2">
                  IP Address *
                </label>
                <input
                  type="text"
                  id="ip_address"
                  name="ip_address"
                  required
                  value={formData.ip_address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., 192.168.1.1"
                />
              </div>

              <div>
                <label htmlFor="device_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Device Type
                </label>
                <select
                  id="device_type"
                  name="device_type"
                  value={formData.device_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="router">Router</option>
                  <option value="switch">Switch</option>
                  <option value="firewall">Firewall</option>
                  <option value="load_balancer">Load Balancer</option>
                  <option value="server">Server</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Data Center A, Rack 5"
                />
              </div>

              <div>
                <label htmlFor="ssh_port" className="block text-sm font-medium text-gray-700 mb-2">
                  SSH Port
                </label>
                <input
                  type="number"
                  id="ssh_port"
                  name="ssh_port"
                  value={formData.ssh_port}
                  onChange={handleInputChange}
                  min="1"
                  max="65535"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication</h3>
            
            {/* TACACS Notice */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    TACACS Authentication
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>All devices use centralized TACACS credentials configured in environment variables. Individual device passwords are no longer required.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  TACACS Username *
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="TACACS username for all devices"
                />
              </div>
            </div>
          </div>

          {/* Device Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Device Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor
                </label>
                <input
                  type="text"
                  id="vendor"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Cisco, Juniper"
                />
              </div>

              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Catalyst 2960"
                />
              </div>

              <div>
                <label htmlFor="os_version" className="block text-sm font-medium text-gray-700 mb-2">
                  OS Version
                </label>
                <input
                  type="text"
                  id="os_version"
                  name="os_version"
                  value={formData.os_version}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., 15.2(7)E10"
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Additional notes about this device..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              to="/devices"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createDeviceMutation.isLoading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled::cursor-not-opacity-50 disabledallowed transition-colors duration-200 flex items-center"
            >
              {createDeviceMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <DeviceTabletIcon className="h-4 w-4 mr-2" />
                  Create Device
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDevice;