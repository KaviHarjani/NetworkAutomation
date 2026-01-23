import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, PlayIcon, DocumentTextIcon, DocumentDuplicateIcon, PencilIcon, TrashIcon, EyeIcon, CodeBracketIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { chefAPI } from '../services/api';

const ChefWorkflows = () => {
  const navigate = useNavigate();
  const [cookbooks, setCookbooks] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cookbooks');
  const [selectedCookbookId, setSelectedCookbookId] = useState(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [filesystemCookbooks, setFilesystemCookbooks] = useState([]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [cookbooksRes, recipesRes, executionsRes] = await Promise.all([
          chefAPI.getCookbooks(),
          chefAPI.getRecipes(),
          chefAPI.getExecutions()
        ]);

        setCookbooks(cookbooksRes.data.cookbooks || []);
        setRecipes(recipesRes.data.recipes || []);
        setExecutions(executionsRes.data.executions || []);

        // Also discover cookbooks from filesystem
        try {
          const discoveryRes = await chefAPI.discoverCookbooks();
          setFilesystemCookbooks(discoveryRes.data.cookbooks || []);
        } catch (discError) {
          console.warn('Could not discover filesystem cookbooks:', discError);
        }
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleImportCookbooks = async () => {
    try {
      setImporting(true);
      const response = await chefAPI.importCookbooks();
      toast.success(response.data.message || `Imported ${response.data.imported} cookbooks`);

      // Refresh cookbooks list
      const cookbooksRes = await chefAPI.getCookbooks();
      setCookbooks(cookbooksRes.data.cookbooks || []);

      // Refresh filesystem discovery
      const discoveryRes = await chefAPI.discoverCookbooks();
      setFilesystemCookbooks(discoveryRes.data.cookbooks || []);
    } catch (error) {
      toast.error('Failed to import cookbooks: ' + (error.response?.data?.error || error.message));
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteCookbook = async (cookbookId) => {
    try {
      await chefAPI.deleteCookbook(cookbookId);
      setCookbooks(cookbooks.filter(c => c.id !== cookbookId));
      toast.success('Cookbook deleted successfully');
    } catch (error) {
      toast.error('Failed to delete cookbook');
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    try {
      await chefAPI.deleteRecipe(recipeId);
      setRecipes(recipes.filter(r => r.id !== recipeId));
      toast.success('Recipe deleted successfully');
    } catch (error) {
      toast.error('Failed to delete recipe');
    }
  };

  const handleExecuteCookbook = async (cookbookId, recipeId) => {
    try {
      const response = await chefAPI.executeCookbook({
        cookbook_id: cookbookId,
        recipe_id: recipeId
      });
      toast.success('Cookbook execution started');
      // Refresh executions
      const executionsRes = await chefAPI.getExecutions();
      setExecutions(executionsRes.data.executions || []);
    } catch (error) {
      toast.error('Failed to execute cookbook');
    }
  };

  const handleExecuteChefWorkflow = async (cookbookId, recipeId) => {
    try {
      const response = await chefAPI.executeCookbook({
        cookbook_id: cookbookId,
        recipe_id: recipeId
      });
      toast.success('Chef workflow execution started');
      // Refresh executions
      const executionsRes = await chefAPI.getExecutions();
      setExecutions(executionsRes.data.executions || []);
    } catch (error) {
      toast.error('Failed to execute Chef workflow: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Chef Workflows</h1>
          <p className="mt-2 text-gray-600">
            Manage Chef cookbooks, recipes, and executions
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'cookbooks', name: 'Cookbooks', icon: DocumentTextIcon },
                { key: 'recipes', name: 'Recipes', icon: DocumentDuplicateIcon },
                { key: 'executions', name: 'Executions', icon: PlayIcon },
                { key: 'api-docs', name: 'API Documentation', icon: CodeBracketIcon }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Cookbooks Tab */}
        {activeTab === 'cookbooks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">Cookbooks</h2>
              <div className="flex space-x-3">
                <button
                  onClick={handleImportCookbooks}
                  disabled={importing}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 mr-2 ${importing ? 'animate-spin' : ''}`} />
                  {importing ? 'Importing...' : 'Import from Filesystem'}
                </button>
                <button
                  onClick={() => navigate('/chef-cookbook-create')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Cookbook
                </button>
              </div>
            </div>

            {/* Filesystem Cookbooks Info */}
            {filesystemCookbooks.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-800 font-medium">
                      {filesystemCookbooks.length} cookbook(s) found in filesystem
                    </span>
                  </div>
                  <button
                    onClick={handleImportCookbooks}
                    disabled={importing}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    Import All
                  </button>
                </div>
              </div>
            )}

            {/* Execute Cookbook Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Execute Cookbook</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Cookbook</label>
                  <select
                    value={selectedCookbookId || ''}
                    onChange={(e) => setSelectedCookbookId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a cookbook...</option>
                    {cookbooks.map((cookbook) => (
                      <option key={cookbook.id} value={cookbook.id}>{cookbook.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Recipe (Optional)</label>
                  <select
                    value={selectedRecipeId || ''}
                    onChange={(e) => setSelectedRecipeId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All recipes (or none specified)</option>
                    {recipes.filter(r => !selectedCookbookId || r.cookbook === selectedCookbookId).map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={() => handleExecuteChefWorkflow(selectedCookbookId, selectedRecipeId)}
                  disabled={!selectedCookbookId}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                    selectedCookbookId
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Execute Workflow
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cookbooks.map((cookbook) => (
                <div key={cookbook.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{cookbook.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{cookbook.description}</p>
                    </div>
                    <div className="ml-4 flex items-center space-x-2 relative z-20">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/chef-cookbook-edit/${cookbook.id}`); }}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 hover:bg-gray-100 rounded"
                        title="Edit Cookbook"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCookbook(cookbook.id); }}
                        className="text-gray-400 hover:text-red-600 cursor-pointer p-1 hover:bg-red-50 rounded"
                        title="Delete Cookbook"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Created by: {cookbook.created_by_username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(cookbook.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-4 flex space-x-3 relative z-20">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/chef-cookbook-view/${cookbook.id}`); }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer hover:border-gray-400 transition-colors duration-200"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/chef-cookbook-edit/${cookbook.id}`); }}
                      className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer hover:border-blue-400 transition-colors duration-200"
                    >
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleExecuteChefWorkflow(cookbook.id, null); }}
                      className="inline-flex items-center px-3 py-2 border border-green-300 text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer hover:border-green-400 transition-colors duration-200"
                    >
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Execute
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {cookbooks.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Cookbooks Yet</h3>
                <p className="text-gray-600 mb-6">Create your first Chef cookbook to get started.</p>
                <button
                  onClick={() => navigate('/chef-cookbook-create')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Cookbook
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recipes Tab */}
        {activeTab === 'recipes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">Recipes</h2>
              <button
                onClick={() => navigate('/chef-recipe-create')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Recipe
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{recipe.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
                      <p className="text-xs text-gray-500 mt-2">Cookbook: {recipe.cookbook_name}</p>
                    </div>
                    <div className="ml-4 flex items-center space-x-2 relative z-20">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/chef-recipe-edit/${recipe.id}`); }}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 hover:bg-gray-100 rounded"
                        title="Edit Recipe"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.id); }}
                        className="text-gray-400 hover:text-red-600 cursor-pointer p-1 hover:bg-red-50 rounded"
                        title="Delete Recipe"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Created: {new Date(recipe.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-4 flex space-x-3 relative z-20">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/chef-recipe-view/${recipe.id}`); }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer hover:border-gray-400 transition-colors duration-200"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/chef-recipe-edit/${recipe.id}`); }}
                      className="inline-flex items-center px-3 py-2 border border-green-300 text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer hover:border-green-400 transition-colors duration-200"
                    >
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {recipes.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Recipes Yet</h3>
                <p className="text-gray-600 mb-6">Create your first Chef recipe to get started.</p>
                <button
                  onClick={() => navigate('/chef-recipe-create')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Recipe
                </button>
              </div>
            )}
          </div>
        )}

        {/* Executions Tab */}
        {activeTab === 'executions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">Executions</h2>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cookbook
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Started
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {executions.map((execution) => (
                      <tr key={execution.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {execution.cookbook_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {execution.cookbook}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {execution.recipe_name || 'All Recipes'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {execution.recipe || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            execution.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : execution.status === 'running'
                              ? 'bg-yellow-100 text-yellow-800'
                              : execution.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {execution.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {execution.started_at ? new Date(execution.started_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {execution.execution_time ? `${execution.execution_time}s` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => navigate(`/chef-execution-detail/${execution.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {executions.length === 0 && (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <PlayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Executions Yet</h3>
                  <p className="text-gray-600 mb-6">Execute a Chef cookbook to see execution results.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* API Documentation Tab */}
        {activeTab === 'api-docs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">API Documentation</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <span className="text-blue-800 text-sm font-medium">Chef Integration</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <CodeBracketIcon className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">Chef API Endpoints</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  New Feature
                </span>
              </div>

              <div className="space-y-6">
                {/* Endpoint Information */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Available Endpoints</h4>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-green-600 font-bold">GET</span>
                        <span className="font-medium">/api/chef-cookbooks/</span>
                      </div>
                      <p className="text-sm text-gray-600">List all Chef cookbooks</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-blue-600 font-bold">POST</span>
                        <span className="font-medium">/api/chef-cookbooks/</span>
                      </div>
                      <p className="text-sm text-gray-600">Create a new Chef cookbook</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-green-600 font-bold">GET</span>
                        <span className="font-medium">/api/chef-recipes/</span>
                      </div>
                      <p className="text-sm text-gray-600">List all Chef recipes</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-blue-600 font-bold">POST</span>
                        <span className="font-medium">/api/chef-executions/execute/</span>
                      </div>
                      <p className="text-sm text-gray-600">Execute a Chef cookbook or recipe</p>
                    </div>
                  </div>
                </div>

                {/* Example Usage */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Example Usage</h4>

                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Generic Automation by Hostname</h5>
                      <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                        <pre>{`curl -X POST http://localhost:8000/api/automation/chef/generic/ \\
  -H "Content-Type: application/json" \\
  -H "X-CSRFToken: <csrf-token>" \\
  -d '{
    "hostname": "server-01",
    "cookbook_name": "web-server",
    "recipe_name": "install_nginx",
    "attributes": {
      "nginx": {
        "port": 8080,
        "server_name": "example.com"
      }
    }
  }'`}</pre>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Execute on Device by ID</h5>
                      <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                        <pre>{`curl -X POST http://localhost:8000/api/automation/chef/execute-on-device/ \\
  -H "Content-Type: application/json" \\
  -H "X-CSRFToken: <csrf-token>" \\
  -d '{
    "device_id": "123e4567-e89b-12d3-a456-426614174000",
    "cookbook_id": "456e7890-e89b-12d3-a456-426614174001",
    "attributes": {
      "custom_config": "production"
    },
    "run_list": ["recipe[web_server]", "recipe[ssl_config]"]
  }'`}</pre>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Execute Cookbook via REST API</h5>
                      <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                        <pre>{`curl -X POST http://localhost:8000/api/chef-executions/execute/ \\
  -H "Content-Type: application/json" \\
  -H "X-CSRFToken: <csrf-token>" \\
  -d '{
    "cookbook_id": "123e4567-e89b-12d3-a456-426614174000",
    "recipe_id": "456e7890-e89b-12d3-a456-426614174001"
  }'`}</pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Key Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Cookbook and recipe management</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Ruby syntax validation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Filesystem import capabilities</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Execution tracking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">REST API integration</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Web interface</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChefWorkflows;