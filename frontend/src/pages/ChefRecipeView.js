import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { chefAPI } from '../services/api';

const ChefRecipeView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await chefAPI.getRecipe(id);
        setRecipe(response.data);
      } catch (error) {
        toast.error('Failed to load recipe');
        navigate('/chef-workflows');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
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

  if (!recipe) {
    return null;
  }

  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // API endpoint information
  const apiEndpoints = [
    {
      name: 'Get Recipe Details',
      method: 'GET',
      endpoint: `/api/chef-recipes/${id}/`,
      description: 'Retrieve details of this recipe',
      curl: `curl -X GET "${baseUrl}/api/chef-recipes/${id}/" -H "Content-Type: application/json" -H "Cookie: sessionid=<your-session-id>"`
    },
    {
      name: 'Update Recipe',
      method: 'PUT',
      endpoint: `/api/chef-recipes/${id}/`,
      description: 'Update this recipe',
      curl: `curl -X PUT "${baseUrl}/api/chef-recipes/${id}/" -H "Content-Type: application/json" -H "X-CSRFToken: <csrf-token>" -d '{"name": "${recipe.name}", "recipe_content": "..."}'`
    },
    {
      name: 'Delete Recipe',
      method: 'DELETE',
      endpoint: `/api/chef-recipes/${id}/`,
      description: 'Delete this recipe',
      curl: `curl -X DELETE "${baseUrl}/api/chef-recipes/${id}/" -H "X-CSRFToken: <csrf-token>"`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/chef-workflows')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Chef Workflows
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{recipe.name}</h1>
              <p className="mt-1 text-gray-600">{recipe.description}</p>
              <p className="text-sm text-gray-500">Cookbook: {recipe.cookbook_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/chef-recipe-edit/${id}`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Recipe Details */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recipe Details</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">ID</label>
                <p className="mt-1 text-sm text-gray-900">{recipe.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Cookbook</label>
                <p className="mt-1 text-sm text-gray-900">{recipe.cookbook_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(recipe.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Updated At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(recipe.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recipe Content */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recipe Content (Ruby)</h2>
            <button
              onClick={() => copyToClipboard(recipe.recipe_content)}
              className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
              Copy
            </button>
          </div>
          <div className="px-6 py-4">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
              {recipe.recipe_content}
            </pre>
          </div>
        </div>

        {/* Attributes */}
        {recipe.attributes_dict && Object.keys(recipe.attributes_dict).length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recipe Attributes</h2>
            </div>
            <div className="px-6 py-4">
              <pre className="bg-gray-50 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {JSON.stringify(recipe.attributes_dict, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* API Endpoints Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">API Endpoints</h2>
            <p className="text-sm text-gray-500 mt-1">Use these endpoints to interact with this recipe programmatically</p>
          </div>
          <div className="divide-y divide-gray-200">
            {apiEndpoints.map((api, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${
                      api.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                      api.method === 'POST' ? 'bg-green-100 text-green-800' :
                      api.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {api.method}
                    </span>
                    <span className="font-medium text-gray-900">{api.name}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(api.curl)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Copy cURL
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2">{api.description}</p>
                <code className="block bg-gray-100 px-3 py-2 rounded text-sm text-gray-800 font-mono">
                  {api.endpoint}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChefRecipeView;