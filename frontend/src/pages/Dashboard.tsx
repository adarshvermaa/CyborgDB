import React from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { MessageSquare, FileText, Activity, Shield, LogOut, Lock } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const handleLogout = () => {
    authService.logout();
  };

  const stats = [
    { label: 'Encrypted Records', value: '1,247', icon: Lock, color: 'bg-blue-500' },
    { label: 'Vector Queries', value: '8,432', icon: Activity, color: 'bg-green-500' },
    { label: 'Chat Sessions', value: '156', icon: MessageSquare, color: 'bg-purple-500' },
    { label: 'Secure Docs', value: '342', icon: FileText, color: 'bg-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Encrypted Medical RAG AI
                </h1>
                <p className="text-sm text-gray-500">HIPAA-Compliant Vector Search Platform</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link to="/chat" className="card hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <MessageSquare className="w-7 h-7 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Encrypted Chat
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Ask questions about medical records with encrypted vector search
                </p>
                <div className="inline-flex items-center text-primary-600 text-sm font-medium">
                  Start conversation →
                </div>
              </div>
            </div>
          </Link>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <FileText className="w-7 h-7 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Medical Records
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  View and manage encrypted patient records
                </p>
                <div className="inline-flex items-center text-green-600 text-sm font-medium">
                  View records →
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                End-to-End Encryption Active
              </h3>
              <p className="text-gray-700 mb-4">
                All medical embeddings are encrypted with AES-256-GCM before storage in CyborgDB.
                Vector search operations maintain encryption throughout, with decryption only happening in-memory.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>HIPAA Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Audit Logging Enabled</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Encrypted Vector Search</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity (placeholder) */}
        <div className="mt-8 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Activity className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Vector query executed</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Medical record uploaded</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Chat session started</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
