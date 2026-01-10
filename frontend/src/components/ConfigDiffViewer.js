import React, { useState, useMemo } from 'react';

const ConfigDiffViewer = ({
  preCheckConfig,
  postCheckConfig,
  diffHtml,
  diffStats,
  viewMode: initialViewMode = 'unified',
  contextLines: initialContextLines = 3
}) => {
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [contextLines, setContextLines] = useState(initialContextLines);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Parse diff HTML and render
  const renderedDiff = useMemo(() => {
    if (diffHtml) {
      return { __html: diffHtml };
    }
    return null;
  }, [diffHtml]);

  // Parse diff stats with defaults
  const stats = useMemo(() => ({
    additions: diffStats?.additions || 0,
    deletions: diffStats?.deletions || 0,
    total_changes: diffStats?.total_changes || 0
  }), [diffStats]);

  // Parse raw configs for raw view
  const parsedPreCheck = useMemo(() => {
    if (typeof preCheckConfig === 'string') {
      return preCheckConfig;
    }
    return preCheckConfig ? JSON.stringify(preCheckConfig, null, 2) : '';
  }, [preCheckConfig]);

  const parsedPostCheck = useMemo(() => {
    if (typeof postCheckConfig === 'string') {
      return postCheckConfig;
    }
    return postCheckConfig ? JSON.stringify(postCheckConfig, null, 2) : '';
  }, [postCheckConfig]);

  return (
    <div className="config-diff-viewer">
      {/* Controls */}
      <div className="diff-controls flex flex-wrap gap-2 mb-4 p-3 bg-gray-100 rounded-lg">
        <div className="flex gap-1">
          <button
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'unified'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setViewMode('unified')}
          >
            Unified Diff
          </button>
          <button
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'split'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setViewMode('split')}
          >
            Split View
          </button>
          <button
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'raw'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setViewMode('raw')}
          >
            Raw Output
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <label className="flex items-center gap-1 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={(e) => setShowLineNumbers(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Line numbers
          </label>

          <select
            className="px-3 py-1.5 rounded text-sm bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={contextLines}
            onChange={(e) => setContextLines(Number(e.target.value))}
          >
            <option value={1}>1 line context</option>
            <option value={3}>3 lines context</option>
            <option value={5}>5 lines context</option>
            <option value={10}>10 lines context</option>
          </select>
        </div>
      </div>

      {/* Diff Stats */}
      <div className="diff-stats flex flex-wrap gap-4 mb-4 p-3 bg-blue-50 rounded-lg">
        <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          +{stats.additions} additions
        </span>
        <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
          -{stats.deletions} deletions
        </span>
        <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {stats.total_changes} total changes
        </span>
      </div>

      {/* Diff Content */}
      <div className="diff-content">
        {viewMode === 'raw' ? (
          <div className="raw-output grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="pre-check">
              <h4 className="font-bold mb-2 text-gray-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                Pre-Check Output
              </h4>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono">
                {parsedPreCheck}
              </pre>
            </div>
            <div className="post-check">
              <h4 className="font-bold mb-2 text-gray-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Post-Check Output
              </h4>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono">
                {parsedPostCheck}
              </pre>
            </div>
          </div>
        ) : (
          <div
            className={`diff-html bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 ${
              viewMode === 'split' ? 'grid grid-cols-2 gap-4' : ''
            }`}
            dangerouslySetInnerHTML={renderedDiff}
          />
        )}
      </div>

      {/* CSS for diff viewer */}
      <style>{`
        .config-diff-viewer {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Fira Code', monospace;
          font-size: 13px;
          line-height: 1.5;
        }

        .config-diff-viewer .diff-header {
          background-color: #f6f8fa;
          color: #6e7781;
          padding: 2px 8px;
          border-bottom: 1px solid #d0d7de;
        }

        .config-diff-viewer .diff-position {
          color: #0550ae;
          background-color: #f6f8fa;
          padding: 2px 8px;
        }

        .config-diff-viewer .diff-add {
          background-color: #dafbe1;
          color: #1a7f37;
          padding: 2px 8px;
          margin-left: 0;
          border-left: 3px solid #1a7f37;
        }

        .config-diff-viewer .diff-del {
          background-color: #ffebe9;
          color: #cf222e;
          padding: 2px 8px;
          margin-left: 0;
          border-left: 3px solid #cf222e;
        }

        .config-diff-viewer .diff-context {
          background-color: #ffffff;
          color: #24292f;
          padding: 2px 8px;
        }

        .config-diff-viewer .diff-other {
          background-color: #f6f8fa;
          color: #6e7781;
          padding: 2px 8px;
        }

        .config-diff-viewer .diff-add:hover,
        .config-diff-viewer .diff-del:hover {
          opacity: 0.9;
        }

        .config-diff-viewer .diff-html pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .config-diff-viewer .diff-html {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
};

export default ConfigDiffViewer;
