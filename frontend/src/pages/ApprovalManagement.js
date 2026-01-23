import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Layout from '../components/Layout';

const ApprovalManagement = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [versionHistory, setVersionHistory] = useState([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);

  useEffect(() => {
    fetchApprovals();
    fetchPendingCount();
  }, [activeTab]);

  const fetchPendingCount = async () => {
    try {
      const response = await api.get('/approvals/pending-count/');
      setPendingCount(response.data.count);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'pending' 
        ? '/approvals/requests/?status=pending'
        : '/approvals/requests/';
      const response = await api.get(endpoint);
      setApprovalRequests(response.data);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const response = await api.get('/approvals/workflows/');
      setWorkflows(response.data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    }
  };

  const fetchVersionHistory = async (playbookId) => {
    try {
      const response = await api.get(`/approvals/playbooks/${playbookId}/versions/`);
      setVersionHistory(response.data);
    } catch (error) {
      console.error('Error fetching version history:', error);
    }
  };

  const handleReview = async (requestId, status) => {
    try {
      await api.post(`/approvals/requests/${requestId}/review/`, {
        status,
        comment: reviewComment
      });
      setShowDetailModal(false);
      setReviewComment('');
      fetchApprovals();
      fetchPendingCount();
    } catch (error) {
      console.error('Error reviewing request:', error);
      alert('Failed to process approval request');
    }
  };

  const handleRollback = async (playbookId, versionId) => {
    if (!window.confirm('Are you sure you want to rollback to this version? This will require approval.')) {
      return;
    }
    try {
      await api.post(`/approvals/playbooks/${playbookId}/rollback/${versionId}/`);
      alert('Rollback request submitted successfully');
    } catch (error) {
      console.error('Error rolling back:', error);
      alert('Failed to submit rollback request');
    }
  };

  const openDetailModal = async (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
    setReviewComment('');
    if (request.playbook_id) {
      await fetchVersionHistory(request.playbook_id);
      setSelectedPlaybook(request.playbook_id);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'yellow',
      approved: 'green',
      rejected: 'red'
    };
    return colors[status] || 'gray';
  };

  const getTypeLabel = (type) => {
    const labels = {
      playbook_create: 'New Playbook',
      playbook_edit: 'Playbook Edit',
      playbook_delete: 'Playbook Delete',
      workflow_create: 'New Workflow',
      workflow_edit: 'Workflow Edit',
      rollback: 'Rollback'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Approval Management</h1>
          <div className="flex items-center gap-4">
            <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-medium">
              {pendingCount} Pending Approvals
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending Approvals
          </button>
          <button
            onClick={() => {
              setActiveTab('all');
              fetchWorkflows();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Requests
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'workflows'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Approval Workflows
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : activeTab === 'workflows' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approvers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workflows.map((workflow) => (
                  <tr key={workflow.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {workflow.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {workflow.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {workflow.approver_roles?.join(', ') || workflow.approvers?.join(', ') || 'Not configured'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        workflow.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                    </td>
                  </tr>
                ))}
                {workflows.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No approval workflows configured. Click "Create Workflow" to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {approvalRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getTypeLabel(request.request_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.playbook?.name || request.workflow?.name || request.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.requested_by?.username || request.requested_by?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${getStatusColor(request.status)}-100 text-${getStatusColor(request.status)}-800`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openDetailModal(request)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
                {approvalRequests.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No pending approval requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Approval Request Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Type</label>
                  <p className="text-gray-900">{getTypeLabel(selectedRequest.request_type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <StatusBadge status={selectedRequest.status} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Requested By</label>
                  <p className="text-gray-900">
                    {selectedRequest.requested_by?.username || selectedRequest.requested_by?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Date</label>
                  <p className="text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>

              {/* Changes/Content */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-500 mb-2">Changes</label>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {selectedRequest.content ? (
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedRequest.content, null, 2)}
                    </pre>
                  ) : selectedRequest.diff ? (
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {selectedRequest.diff}
                    </pre>
                  ) : (
                    <p className="text-gray-500">No changes to display</p>
                  )}
                </div>
              </div>

              {/* Version History (if playbook) */}
              {selectedPlaybook && versionHistory.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Version History</label>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Version</th>
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Status</th>
                          <th className="text-left py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {versionHistory.map((version) => (
                          <tr key={version.id} className="border-b last:border-0">
                            <td className="py-2">v{version.version_number}</td>
                            <td className="py-2">{formatDate(version.created_at)}</td>
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                version.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {version.is_approved ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-2">
                              {version.id !== selectedRequest.playbook_version_id && (
                                <button
                                  onClick={() => handleRollback(selectedPlaybook, version.id)}
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  Rollback
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Previous Reviews */}
              {selectedRequest.reviews?.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Previous Reviews</label>
                  <div className="space-y-3">
                    {selectedRequest.reviews.map((review, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{review.reviewer?.username}</span>
                          <StatusBadge status={review.status} />
                        </div>
                        <p className="text-sm text-gray-600">{review.comment}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(review.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Comment */}
              {selectedRequest.status === 'pending' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Review Comment (optional)
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Add a comment for your decision..."
                  />
                </div>
              )}

              {/* Actions */}
              {selectedRequest.status === 'pending' && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleReview(selectedRequest.id, 'rejected')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleReview(selectedRequest.id, 'approved')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ApprovalManagement;
