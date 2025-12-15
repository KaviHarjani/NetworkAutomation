import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, CodeBracketIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ansibleAPI } from '../services/api';

const AnsiblePlaybookEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    playbook_content: '',
    tags: '',
    variables: '{}'
  });

  useEffect(() => {
    const loadPlaybook = async () => {
      try {
        setLoading(true);
        const response = await ansibleAPI.getPlaybook(id);
        const playbook = response.data;
        setFormData({
          name: playbook.name || '',
          description: playbook.description || '',
          playbook_content: playbook.playbook_content || '',
          tags: playbook.tags_list ? playbook.tags_list.join(', ') : '',
          variables: playbook.variables ? JSON.stringify(playbook.variables, null, 2) : '{}'
        });
      } catch (error) {
        toast.error('Failed to load playbook');
        navigate('/ansible-workflows');
      } finally {
        setLoading(false);
      }
    };

    loadPlaybook();
  }, [id, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleValidate = async () => {
    try {
      const response = await ansibleAPI.validatePlaybook(formData.playbook_content);
      setValidationResult(response.data);
      if (response.data.valid) {
        toast.success('Playbook is valid!');
      } else {
        toast.error('Playbook validation failed');
      }
    } catch (error) {
      toast.error('Validation failed');
      setValidationResult({ valid: false, error: 'Validation service unavailable' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Playbook name is required');
      return;
    }

    if (!formData.playbook_content.trim()) {
      toast.error('Playbook content is required');
      return;
    }

    setIsSubmitting(true);

    try {
      let tagsList = [];
      if (formData.tags.trim()) {
        tagsList = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }

      let variablesObj = {};
      try {
        variablesObj = JSON.parse(formData.variables);
      } catch (error) {
        toast.error('Invalid JSON in variables field');
        setIsSubmitting(false);
        return;
      }

      const submitData = {
        name: formData.name,
        description: formData.description,
        playbook_content: formData.playbook_content,
        tags: tagsList,
        variables: variablesObj
      };

      await ansibleAPI.updatePlaybook(id, submitData);
      toast.success('Playbook updated successfully!');
      navigate('/ansible-workflows');
    } catch (error) {
      toast.error('Failed to update playbook');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/ansible-workflows')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Ansible Workflows
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Edit Ansible Playbook</h1>
          <p className="mt-2 text-gray-600">
            Update the playbook configuration and content
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Playbook Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter playbook name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter playbook description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="web, nginx, deployment"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Variables (JSON)
                </label>
                <textarea
                  value={formData.variables}
                  onChange={(e) => handleInputChange('variables', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Playbook Content</h2>
              <button
                type="button"
                onClick={handleValidate}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <CodeBracketIcon className="w-4 h-4 mr-2" />
                Validate YAML
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                required
                value={formData.playbook_content}
                onChange={(e) => handleInputChange('playbook_content', e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="Enter your Ansible playbook YAML content here..."
              />

              {validationResult && (
                <div className={`p-4 rounded-md ${validationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center">
                    {validationResult.valid ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                    )}
                    <span className={`text-sm font-medium ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                      {validationResult.valid ? 'Valid YAML' : 'Invalid YAML'}
                    </span>
                  </div>
                  {validationResult.error && (
                    <p className="mt-2 text-sm text-red-700">{validationResult.error}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/ansible-workflows')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnsiblePlaybookEdit;
