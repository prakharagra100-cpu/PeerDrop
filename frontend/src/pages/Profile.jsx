import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { User, Mail, Shield, Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-6">
        <Link to="/dashboard" className="text-gray-500 hover:text-blue-600 flex items-center transition">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-32 relative">
          <div className="absolute -bottom-12 left-8 border-4 border-white bg-white p-2 rounded-full shadow-md">
            <div className="bg-blue-50 text-blue-600 p-4 rounded-full">
              <User className="w-12 h-12" />
            </div>
          </div>
        </div>
        
        <div className="pt-16 pb-8 px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">User Profile</h1>
          <p className="text-gray-500 mb-8">Manage your account details and preferences.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-4 p-4 rounded-xl bg-gray-50 border">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email Address</p>
                <p className="text-base font-semibold text-gray-900 mt-1">{user?.email || 'Loading...'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 rounded-xl bg-gray-50 border">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Account Role</p>
                <p className="text-base font-semibold text-gray-900 mt-1 capitalize">{user?.role || 'Loading...'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 rounded-xl bg-gray-50 border md:col-span-2">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Member Since</p>
                <p className="text-base font-semibold text-gray-900 mt-1">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
