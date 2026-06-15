import React from 'react';
import { Rocket } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 xl:px-24 bg-white relative z-10">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-10 text-center lg:text-left">
            <div className="inline-flex bg-blue-600 p-3 rounded-2xl text-white mb-6 shadow-lg shadow-blue-500/30">
              <Rocket className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">{title}</h1>
            <p className="text-gray-500 font-medium">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>

      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 items-center justify-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
        <div className="relative z-20 text-center px-12">
          <h2 className="text-4xl font-bold text-white mb-6">Secure P2P File Transfers</h2>
          <p className="text-blue-100 text-lg max-w-md mx-auto leading-relaxed">
            Experience lightning-fast, decentralized file sharing. Connect directly with peers and securely drop files of any size without the middleman.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
