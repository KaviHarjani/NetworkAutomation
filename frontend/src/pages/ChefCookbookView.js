import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, PlayIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { chefAPI } from '../services/api';

const ChefCookbookView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cookbook, setCookbook] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [cookbookRes, recipesRes] = await Promise.all([
          chefAPI.getCookbook(id),
          chefAPI.getRecipes({ cookbook_id: id })
        ]);
        setCookbook(cookbookRes.data);
        setRecipes(recipesRes.data.recipes || []);
      } catch (error) {
        toast.error('Failed to load cookbook');
        navigate('/chef-workflows');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const handleExecute = async () => {
    if (!selectedRecipe) {
      toast.error('Please select a recipe');
      return;
    }
    try {
      await chefAPI.executeCookbook({
        cookbook_id: id,
        recipe_id: selectedRecipe
      });
      toast.success('Cookbook execution started');
      navigate('/chef-workflows');
    } catch (error) {
      toast.error('Failed to execute cookbook');
    }
  };

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

  if (!cookbook) {
    return null;
  }

  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // API endpoint information
  const apiEndpoints = [
    {
      name: 'Get Cookbook Details',
      method: 'GET',
      endpoint: `/api/chef-cookbooks/${id}/`,
      description: 'Retrieve details of this cookbook',
      curl: `curl -X GET "${baseUrl}/api/chef-cookbooks/${id}/" -H "Content-Type: application/json" -H "Cookie: sessionid=<your-session-id>"`
    },
    {
      name: 'Update Cookbook',
      method: 'PUT',
      endpoint: `/api/chef-cookbooks/${id}/`,
      description: 'Update this cookbook',
      curl: `curl -X PUT "${baseUrl}/api/chef-cookbooks/${id}/" -H "Content-Type: application/json" -H "X-CSRFToken: <csrf-token>" -d '{"name": "${cookbook.name}", "cookbook_content": "..."}'`
    },
    {
      name: 'Delete Cookbook',
      method: 'DELETE',
      endpoint: `/api/chef-cookbooks/${id}/`,
      description: 'Delete this cookbook',
      curl: `curl -X DELETE "${baseUrl}/api/chef-cookbooks/${id}/" -H "X-CSRFToken: <csrf-token>"`
    },
    {
      name: 'Execute Cookbook',
      method: 'POST',
      endpoint: `/api/chef-executions/execute/`,
      description: 'Execute this cookbook with a recipe',
      curl: `curl -X POST "${baseUrl}/api/chef-executions/execute/" -H "Content-Type: application/json" -H "X-CSRFToken: <csrf-token>" -d '{"cookbook_id": ${id}, "recipe_id": <recipe-id>}'`
    },
    {
      name: 'Validate Cookbook',
      method: 'POST',
      endpoint: `/api/chef-cookbooks/validate/`,
      description: 'Validate cookbook Ruby syntax',
      curl: `curl -X POST "${baseUrl}/api/chef-cookbooks/validate/" -H "Content-Type: application/json" -H "X-CSRFToken: <csrf-token>" -d '{"cookbook_content": "..."}'`
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
              <h1 className="text-3xl font-bold text-gray-900">{cookbook.name}</h1>
              <p className="mt-1 text-gray-600">{cookbook.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/chef-cookbook-edit/${id}`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Cookbook Details */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Cookbook Details</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">ID</label>
                <p className="mt-1 text-sm text-gray-900">{cookbook.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created By</label>
                <p className="mt-1 text-sm text-gray-900">{cookbook.created_by_username || 'Unknown'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(cookbook.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Updated At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(cookbook.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cookbook Content */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Cookbook Content (Ruby)</h2>
            <button
              onClick={() => copyToClipboard(cookbook.cookbook_content)}
              className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
              Copy
            </button>
          </div>
          <div className="px-6 py-4">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
              {cookbook.cookbook_content}
            </pre>
          </div>
        </div>

        {/* Recipes Section */}
        {recipes.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recipes</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                {recipes.map((recipe) => (
                  <div key={recipe.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{recipe.name}</h3>
                      <p className="text-sm text-gray-600">{recipe.description}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/chef-recipe-view/${recipe.id}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Recipe
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Execute Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Execute Cookbook</h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Recipe
                </label>
                <select
                  value={selectedRecipe}
                  onChange={(e) => setSelectedRecipe(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a recipe...</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExecute}
                disabled={!selectedRecipe}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Execute
              </button>
            </div>
          </div>
        </div>

        {/* API Endpoints Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">API Endpoints</h2>
            <p className="text-sm text-gray-500 mt-1">Use these endpoints to interact with this cookbook programmatically</p>
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

export default ChefCookbookView;