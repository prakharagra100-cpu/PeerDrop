import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import { FileQuestion } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center max-w-md w-full">
        <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
          <FileQuestion className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          The page you are looking for doesn't exist, has been moved, or is currently unavailable.
        </p>
        <Button onClick={() => navigate('/dashboard')} className="w-full">
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
