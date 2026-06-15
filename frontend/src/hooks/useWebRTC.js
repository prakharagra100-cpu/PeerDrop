import { useEffect, useRef, useState } from 'react';

const CHUNK_SIZE = 65536; // 64KB per chunk

export const useWebRTC = (socket, roomId) => {
  const peerConnection = useRef(null);
  const dataChannel = useRef(null);
  const [connected, setConnected] = useState(false);
  
  const receivedBuffers = useRef([]);
  const receivedSize = useRef(0);
  const expectedSize = useRef(0);
  const currentFileName = useRef('');
  const pendingCandidates = useRef([]);
  
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferStatus, setTransferStatus] = useState('idle');
  const [fatalError, setFatalError] = useState(null);
  const [incomingFile, setIncomingFile] = useState(null);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const isCancelled = useRef(false);
  const lastPercent = useRef(-1);
  const receivedUrls = useRef([]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join-room', roomId);

    socket.on('user-connected', async (userId) => {
      console.log('User connected, creating offer to', userId);
      createPeerConnection();
      
      dataChannel.current = peerConnection.current.createDataChannel('fileTransfer');
      setupDataChannel(dataChannel.current);

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit('offer', { target: userId, offer });
    });

    socket.on('offer', async ({ target, offer }) => {
      console.log('Received offer');
      createPeerConnection();
      
      peerConnection.current.ondatachannel = (event) => {
        dataChannel.current = event.channel;
        setupDataChannel(dataChannel.current);
      };

      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      pendingCandidates.current.forEach(c => {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error(e));
      });
      pendingCandidates.current = [];

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit('answer', { target, answer });
    });

    socket.on('answer', async ({ target, answer }) => {
      console.log('Received answer');
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      pendingCandidates.current.forEach(c => {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error(e));
      });
      pendingCandidates.current = [];
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (candidate) {
        if (peerConnection.current && peerConnection.current.remoteDescription) {
          try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding received ice candidate', e);
          }
        } else {
          pendingCandidates.current.push(candidate);
        }
      }
    });

    return () => {
      socket.off('user-connected');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      if (peerConnection.current) peerConnection.current.close();
      receivedUrls.current.forEach(u => URL.revokeObjectURL(u));
    };
  }, [socket, roomId]);

  const createPeerConnection = () => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    });

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { candidate: event.candidate });
      }
    };

    peerConnection.current.onconnectionstatechange = () => {
      if (peerConnection.current.connectionState === 'connected') {
        setConnected(true);
      } else if (peerConnection.current.connectionState === 'disconnected' || peerConnection.current.connectionState === 'failed') {
        setConnected(false);
        cancelTransfer();
        if (peerConnection.current.connectionState === 'failed') {
          setFatalError('P2P connection failed or timed out');
        }
      }
    };
  };

  const setupDataChannel = (channel) => {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = 65535; // 64KB
    channel.onopen = () => console.log('Data channel is open');
    channel.onclose = () => {
      console.log('Data channel is closed');
      cancelTransfer();
    };
    channel.onerror = (err) => {
      console.error('Data channel error:', err);
      cancelTransfer();
    };
    
    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const metadata = JSON.parse(event.data);
        if (metadata.type === 'file-start') {
          expectedSize.current = metadata.size;
          currentFileName.current = metadata.name;
          receivedSize.current = 0;
          receivedBuffers.current = [];
          lastPercent.current = 0;
          setTransferProgress(0);
          setTransferStatus('transferring');
          setIncomingFile({ name: metadata.name, size: metadata.size });
        } else if (metadata.type === 'file-done') {
          const blob = new Blob(receivedBuffers.current);
          const url = URL.createObjectURL(blob);
          receivedUrls.current.push(url);
          const a = document.createElement('a');
          a.href = url;
          a.download = currentFileName.current;
          a.click();
          
          setReceivedFiles(prev => [...prev, { 
            id: Math.random().toString(), 
            name: currentFileName.current, 
            size: expectedSize.current, 
            url 
          }]);
          
          setTransferProgress(100);
          setTransferStatus('completed');
          setIncomingFile(null);
        } else if (metadata.type === 'file-cancel') {
          setIncomingFile(null);
          setTransferProgress(0);
          setTransferStatus('idle');
          receivedBuffers.current = [];
        }
      } else {
        receivedBuffers.current.push(event.data);
        receivedSize.current += event.data.byteLength;
        const percent = Math.floor((receivedSize.current / expectedSize.current) * 100);
        if (percent > lastPercent.current) {
          setTransferProgress(percent);
          lastPercent.current = percent;
        }
      }
    };
  };

  const sendFile = (file) => {
    if (!dataChannel.current || dataChannel.current.readyState !== 'open') return;

    isCancelled.current = false;
    lastPercent.current = 0;
    setTransferStatus('transferring');
    setTransferProgress(0);
    dataChannel.current.send(JSON.stringify({
      type: 'file-start',
      name: file.name,
      size: file.size
    }));

    const reader = new FileReader();
    let offset = 0;

    reader.onload = (e) => {
      if (isCancelled.current) return;
      if (!dataChannel.current || dataChannel.current.readyState !== 'open') return;
      
      try {
        dataChannel.current.send(e.target.result);
        offset += e.target.result.byteLength;
        
        const percent = Math.floor((offset / file.size) * 100);
        if (percent > lastPercent.current) {
          setTransferProgress(percent);
          lastPercent.current = percent;
        }

        if (offset < file.size) {
          readSlice(offset);
        } else {
          dataChannel.current.send(JSON.stringify({ type: 'file-done' }));
          setTransferStatus('completed');
        }
      } catch (err) {
        console.error('Failed to send data chunk', err);
        cancelTransfer();
      }
    };

    const readSlice = (o) => {
      if (isCancelled.current) return;
      if (dataChannel.current.bufferedAmount > 1024 * 1024) { // 1MB buffer limit
        dataChannel.current.onbufferedamountlow = () => {
          dataChannel.current.onbufferedamountlow = null;
          readNextSlice(o);
        };
        return;
      }
      readNextSlice(o);
    };

    const readNextSlice = (o) => {
      const slice = file.slice(o, o + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    };

    readSlice(0);
  };

  const cancelTransfer = () => {
    isCancelled.current = true;
    if (dataChannel.current && dataChannel.current.readyState === 'open') {
      dataChannel.current.send(JSON.stringify({ type: 'file-cancel' }));
    }
    setTransferProgress(0);
    setTransferStatus('failed');
  };

  return { connected, sendFile, cancelTransfer, transferProgress, transferStatus, fatalError, incomingFile, receivedFiles };
};
