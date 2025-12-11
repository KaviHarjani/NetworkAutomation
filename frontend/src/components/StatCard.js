import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'blue', trend }) => {
  // Modern color palette with gradient effects
  const colorConfig = {
    blue: {
      gradient: 'from-blue-500 to-cyan-400',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      iconBg: 'bg-gradient-to-br from-blue-400 to-cyan-300',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    },
    red: {
      gradient: 'from-red-500 to-pink-400',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      iconBg: 'bg-gradient-to-br from-red-400 to-pink-300',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    },
    green: {
      gradient: 'from-green-500 to-emerald-400',
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      iconBg: 'bg-gradient-to-br from-green-400 to-emerald-300',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    },
    yellow: {
      gradient: 'from-yellow-500 to-amber-400',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      iconBg: 'bg-gradient-to-br from-yellow-400 to-amber-300',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    },
    purple: {
      gradient: 'from-purple-500 to-violet-400',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-900',
      iconBg: 'bg-gradient-to-br from-purple-400 to-violet-300',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    },
    indigo: {
      gradient: 'from-indigo-500 to-purple-400',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-900',
      iconBg: 'bg-gradient-to-br from-indigo-400 to-purple-300',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    }
  };

  const config = colorConfig[color] || colorConfig.blue;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:transform hover:-translate-y-1 bg-white border border-gray-100">
      {/* Decorative background gradient */}
      <div className={`absolute inset-0 opacity-5 ${config.gradient} rounded-2xl`}></div>

      {/* Card content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium uppercase tracking-wider text-gray-600 opacity-80">
              {title}
            </p>
            <p className="text-4xl font-bold mt-3 text-gray-900">
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-2 mt-3">
                <div className={`p-1 rounded-full ${trend.positive ? 'bg-green-100' : 'bg-red-100'}`}>
                  {trend.positive ? (
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-gray-500">
                  {trend.positive ? 'increase' : 'decrease'} from last period
                </span>
              </div>
            )}
          </div>

          {/* Icon container with modern glass effect */}
          <div className={`ml-4 p-4 rounded-xl ${config.iconBg} shadow-lg`}>
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decorative element */}
      <div className={`h-1 ${config.gradient} rounded-b-2xl`}></div>
    </div>
  );
};

export default StatCard;