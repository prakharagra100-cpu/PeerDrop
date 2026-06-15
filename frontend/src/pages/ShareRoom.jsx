import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, CheckCircle, XCircle } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import Button from '../components/Button.jsx';
import { useSocket } from '../hooks/useSocket.js';
import { useWebRTC } from '../hooks/useWebRTC.js';
import api from '../services/api.js';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const ShareRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { connected, sendFile, transferProgress, transferStatus, fatalError, incomingFile, receivedFiles, cancelTransfer } = useWebRTC(socket, id);
  const { user } = useAuth();
  
  const [files, setFiles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSender, setIsSender] = useState(false);
  const [activeFileId, setActiveFileId] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [peerDisconnected, setPeerDisconnected] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await api.get(`/rooms/${id}`);
        if (res.data.success) {
          const isSenderUser = res.data.room.senderId === user?.id;
          setIsSender(isSenderUser);
          
          if (!isSenderUser && res.data.room.status === 'waiting') {
            await api.post(`/rooms/${id}/join`);
          }
        }
      } catch (err) {
        console.error("Failed to fetch room", err);
      }
    };
    if (user) {
      fetchRoom();
    }
  }, [id, user]);

  useEffect(() => {
    if (!socket) return;
    
    const handleRoomClosed = () => {
      alert('The room has been closed by the sender.');
      navigate('/dashboard');
    };
    
    const handleUserDisconnected = () => {
      setPeerDisconnected(true);
    };

    socket.on('room-closed', handleRoomClosed);
    socket.on('user-disconnected', handleUserDisconnected);
    
    return () => {
      socket.off('room-closed', handleRoomClosed);
      socket.off('user-disconnected', handleUserDisconnected);
    };
  }, [socket, navigate]);

  const closeRoom = async () => {
    try {
      if (isSender) {
        await api.put(`/rooms/${id}/close`);
        socket.emit('room-closed');
      }
      setIsModalOpen(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to close room', err);
      setIsModalOpen(false);
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    if (fatalError) {
      alert(`Critical error: ${fatalError}. The room will be closed.`);
      closeRoom();
    }
  }, [fatalError]);

  useEffect(() => {
    if (!connected || !isSender) return;

    if (!activeFileId) {
      const nextFile = files.find(f => f.status === 'pending');
      if (nextFile) {
        setActiveFileId(nextFile.id);
        setFiles(prev => prev.map(f => f.id === nextFile.id ? { ...f, status: 'transferring' } : f));
        sendFile(nextFile.file);
      }
    }
  }, [files, activeFileId, connected, isSender, sendFile]);

  useEffect(() => {
    if (activeFileId) {
      if (transferStatus === 'completed') {
        setFiles(prev => {
          const current = prev.find(f => f.id === activeFileId);
          if (current && current.status !== 'completed') {
            api.post(`/rooms/${id}/files`, { name: current.file.name, size: current.file.size, status: 'completed' }).catch(console.error);
          }
          return prev.map(f => f.id === activeFileId ? { ...f, status: 'completed', progress: 100 } : f);
        });
        setActiveFileId(null);
      } else if (transferStatus === 'failed') {
        setFiles(prev => {
          const current = prev.find(f => f.id === activeFileId);
          if (current && current.status !== 'failed') {
            api.post(`/rooms/${id}/files`, { name: current.file.name, size: current.file.size, status: 'failed' }).catch(console.error);
          }
          return prev.map(f => f.id === activeFileId ? { ...f, status: 'failed', progress: 0 } : f);
        });
        setActiveFileId(null);
      } else if (transferStatus === 'transferring') {
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, progress: transferProgress } : f));
      }
    }
  }, [transferStatus, transferProgress, activeFileId, id]);

  useEffect(() => {
    let timeout;
    
    if (connected) {
      if (transferStatus !== 'transferring' && activeFileId === null) {
        timeout = setTimeout(() => {
          alert('Room closed due to inactivity (5 minutes idle).');
          closeRoom();
        }, 5 * 60 * 1000);
      }
    } else {
      timeout = setTimeout(() => {
        alert('Room closed because no one joined within 5 minutes.');
        closeRoom();
      }, 5 * 60 * 1000);
    }
    
    return () => clearTimeout(timeout);
  }, [connected, transferStatus, activeFileId]);

  const onDrop = useCallback(acceptedFiles => {
    setFileError(null);
    const validFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: 'pending',
      progress: 0
    }));
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  const onDropRejected = useCallback(fileRejections => {
    if (fileRejections.length > 0) {
      let errorMsg = `Rejected ${fileRejections.length} file(s). `;
      
      const errors = fileRejections[0].errors.map(e => e.code);
      if (errors.includes('too-many-files')) errorMsg += 'Maximum 10 files allowed at once. ';
      if (errors.includes('file-too-large')) errorMsg += 'Maximum size is 100MB per file. ';
      if (errors.includes('folder-drop')) errorMsg += 'Folders/Apps are not supported (please zip them). ';
      if (errors.includes('empty-file')) errorMsg += 'Empty files are not allowed. ';
      
      setFileError(errorMsg.trim());
      setTimeout(() => setFileError(null), 5000);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    onDropRejected,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 10
  });

  const handleCancel = (fileId) => {
    if (fileId === activeFileId) {
      cancelTransfer();
    } else {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'failed' } : f));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room ID: <span className="text-blue-600 tracking-wider">{id}</span></h1>
          <p className="text-gray-500 mt-1 flex items-center">
            {connected ? (
              <>
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-green-600 font-medium">Connected to peer</span>
              </>
            ) : (
              <>
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
                Waiting for peer connection...
              </>
            )}
          </p>
          {peerDisconnected && (
            <p className="text-red-500 font-medium text-sm mt-2 flex items-center">
              <XCircle className="w-4 h-4 mr-1" />
              The peer has disconnected. No further files can be transferred.
            </p>
          )}
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="outline">
          Room Options
        </Button>
      </div>

      {isSender ? (
        <>
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-colors duration-200 ease-in-out ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 bg-white'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center space-y-5">
              <div className="p-4 bg-blue-50 rounded-full shadow-inner border border-blue-100">
                <UploadCloud className="w-12 h-12 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-800">Drag & drop files here</p>
                <p className="text-base text-gray-500 mt-2">or click to browse from your device</p>
                <p className="text-sm text-gray-400 mt-4 max-w-md mx-auto">
                  Files are securely streamed via WebRTC. <br/>
                  <span className="font-medium text-gray-500">Limits: Max 100MB per file, Max 10 files at once.</span><br/>
                  <span className="text-xs">Supported: All file types. Folders/Apps must be zipped.</span>
                </p>
              </div>
            </div>
          </div>

          {fileError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-left animate-in fade-in slide-in-from-top-2">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Upload Failed</h3>
                <p className="text-sm text-red-600 mt-1">{fileError}</p>
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-8 bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                <h2 className="font-semibold text-gray-800">Active Transfers</h2>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">{files.length} Files</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {files.map(f => (
                  <li key={f.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        <FileIcon className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px] sm:max-w-xs">{f.file.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 sm:w-1/2">
                      <div className="flex-grow bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-300 ${f.progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                          style={{ width: `${f.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-10 text-right">{f.progress}%</span>
                      {f.progress === 100 ? (
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      ) : (
                        <button onClick={() => handleCancel(f.id)} className="text-gray-300 hover:text-red-500 transition shrink-0">
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="border border-gray-200 bg-white rounded-2xl p-16 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center space-y-5">
            <div className="p-4 bg-green-50 rounded-full shadow-inner border border-green-100">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-800">Ready to receive files</p>
              <p className="text-base text-gray-500 mt-2">Connected to the sender. Any files sent to you will appear here.</p>
            </div>
            
            {incomingFile && (
              <div className="w-full max-w-md mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl text-left">
                <p className="text-sm font-medium text-blue-900 mb-2">Incoming File: {incomingFile.name}</p>
                <div className="flex items-center space-x-4">
                  <div className="flex-grow bg-white rounded-full h-2.5 overflow-hidden border border-blue-100">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-300 bg-blue-600`} 
                      style={{ width: `${transferProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-blue-700 w-10 text-right">{transferProgress}%</span>
                </div>
              </div>
            )}
            
            {receivedFiles.length > 0 && (
              <div className="w-full max-w-md mt-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 text-left">Received Files</h3>
                <ul className="space-y-2">
                  {receivedFiles.map(rf => (
                    <li key={rf.id} className="flex justify-between items-center p-3 bg-gray-50 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileIcon className="w-5 h-5 text-green-500" />
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{rf.name}</span>
                      </div>
                      <a href={rf.url} download={rf.name} className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 transition-colors">Download</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Room Administration">
        <p className="text-gray-600 mb-6 text-sm">
          This room is currently active. Share the following secure URL with a peer to establish a direct connection.
        </p>
        <div className="bg-gray-50 border p-4 rounded-lg text-sm font-mono text-center mb-6 break-all select-all text-blue-700 shadow-inner">
          {window.location.href}
        </div>
        <div className="flex justify-end space-x-3 pt-2 border-t mt-4">
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Close Menu</Button>
          {isSender ? (
            <Button variant="danger" onClick={closeRoom}>Close Room</Button>
          ) : (
            <Button variant="danger" onClick={() => navigate('/dashboard')}>Leave Room</Button>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ShareRoom;
