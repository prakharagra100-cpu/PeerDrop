import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { Activity, Users, FileStack, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../components/Button.jsx';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [joinRoomId, setJoinRoomId] = useState('');

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/dashboard/metrics?page=${page}&limit=5`);
        setMetrics(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [page]);

  const createRoom = async () => {
    try {
      const res = await api.post('/rooms/create');
      navigate(`/room/${res.data.room.roomId}`);
    } catch (err) {
      console.error("Failed to create room", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.email}</h1>
          <p className="text-gray-500 mt-1">Here's your P2P transfer overview.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-white rounded-lg border shadow-sm overflow-hidden">
            <input 
              type="text" 
              placeholder="Enter Room ID" 
              className="px-4 py-2 outline-none text-sm w-40 sm:w-auto"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && joinRoomId.trim()) {
                  navigate(`/room/${joinRoomId.trim()}`);
                }
              }}
            />
            <button 
              onClick={() => joinRoomId.trim() && navigate(`/room/${joinRoomId.trim()}`)}
              className="bg-gray-50 hover:bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 border-l transition-colors"
            >
              Join
            </button>
          </div>
          <Button onClick={createRoom} className="!py-2 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 shrink-0">
            <Plus className="w-5 h-5 mr-2" />
            New Transfer Room
          </Button>
        </div>
      </div>

      {user?.role === 'admin' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard 
            title="Total Global Users" 
            value={loading ? '...' : metrics?.totalUsers} 
            icon={<Users className="w-6 h-6 text-blue-500" />} 
          />
          <MetricCard 
            title="Total Rooms Created" 
            value={loading ? '...' : metrics?.totalRooms} 
            icon={<FileStack className="w-6 h-6 text-purple-500" />} 
          />
          <MetricCard 
            title="Active P2P Sessions" 
            value={loading ? '...' : metrics?.activeRooms} 
            icon={<Activity className="w-6 h-6 text-green-500" />} 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard 
            title="My Rooms" 
            value={loading ? '...' : metrics?.myTotalRooms} 
            icon={<FileStack className="w-6 h-6 text-blue-500" />} 
          />
          <MetricCard 
            title="Files Transferred" 
            value={loading ? '...' : metrics?.myTotalFiles} 
            icon={<Activity className="w-6 h-6 text-purple-500" />} 
          />
          <MetricCard 
            title="Active Rooms" 
            value={loading ? '...' : metrics?.myActiveRooms} 
            icon={<Users className="w-6 h-6 text-green-500" />} 
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Recent Transfers</h2>
          <div className="flex items-center space-x-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-sm text-gray-600">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-gray-200"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
                <th className="px-6 py-4 font-medium">File Name</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400">Loading history...</td>
                </tr>
              ) : metrics?.recentHistory?.length > 0 ? (
                metrics.recentHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.filename}</td>
                    <td className="px-6 py-4 text-gray-500">{(item.size / 1024 / 1024).toFixed(2)} MB</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{new Date(item.date).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-400">No recent transfers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center space-x-4">
    <div className="p-3 bg-gray-50 rounded-lg border">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  </div>
);

export default Dashboard;
