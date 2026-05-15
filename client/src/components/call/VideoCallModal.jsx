import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * VideoCallModal handles the entire WebRTC lifecycle:
 *   Outgoing call  → caller=true,  remoteUser = the person being called
 *   Incoming call  → caller=false, remoteUser = the person calling
 */
export default function VideoCallModal({
  socket,
  currentUser,
  remoteUser,      // { _id, username, fullName, avatar }
  callType,        // 'video' | 'audio'
  isCaller,        // true if WE initiated the call
  incomingOffer,   // only set for callee
  onClose,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);           // RTCPeerConnection
  const localStreamRef = useRef(null);  // our camera/mic stream

  const [callState, setCallState] = useState(isCaller ? 'calling' : 'incoming'); // 'incoming'|'calling'|'connected'|'ended'
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callType === 'video');
  const [callTimer, setCallTimer] = useState(0);
  const timerRef = useRef(null);

  // ─── Cleanup helper ─────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
  }, []);

  // ─── End call (either party) ────────────────────────────────────────────────
  const endCall = useCallback((notifyRemote = true) => {
    if (notifyRemote && socket && remoteUser) {
      socket.emit('call_end', { toUserId: remoteUser._id });
    }
    setCallState('ended');
    cleanup();
    setTimeout(onClose, 1200); // short delay to show "Call ended"
  }, [socket, remoteUser, cleanup, onClose]);

  // ─── Reject incoming call ───────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    socket?.emit('call_reject', { toUserId: remoteUser._id });
    setCallState('ended');
    setTimeout(onClose, 800);
  }, [socket, remoteUser, onClose]);

  // ─── Build RTCPeerConnection ─────────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Forward ICE candidates to the other peer via signaling server
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket && remoteUser) {
        socket.emit('ice_candidate', { toUserId: remoteUser._id, candidate });
      }
    };

    // When remote tracks arrive, attach to the remote video element
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        endCall(false);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket, remoteUser, endCall]);

  // ─── Get local media then initiate call ─────────────────────────────────────
  const startCall = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit('call_offer', { toUserId: remoteUser._id, offer, callType });
    } catch (err) {
      toast.error('Could not access camera/microphone.');
      endCall(false);
    }
  }, [callType, createPeerConnection, socket, remoteUser, endCall]);

  // ─── Accept incoming call ────────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    setCallState('connecting');
    try {
      const constraints = {
        audio: true,
        video: callType === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit('call_answer', { toUserId: remoteUser._id, answer });
    } catch (err) {
      toast.error('Could not access camera/microphone.');
      rejectCall();
    }
  }, [callType, createPeerConnection, incomingOffer, socket, remoteUser, rejectCall]);

  // ─── Socket event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onAnswer = async ({ answer }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const onIceCandidate = async ({ candidate }) => {
      try {
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) { /* ignore stale candidates */ }
    };

    const onCallRejected = ({ reason }) => {
      toast.error(reason || 'Call declined.');
      endCall(false);
    };

    const onCallEnded = () => {
      endCall(false);
    };

    socket.on('call_answer', onAnswer);
    socket.on('ice_candidate', onIceCandidate);
    socket.on('call_rejected', onCallRejected);
    socket.on('call_ended', onCallEnded);

    return () => {
      socket.off('call_answer', onAnswer);
      socket.off('ice_candidate', onIceCandidate);
      socket.off('call_rejected', onCallRejected);
      socket.off('call_ended', onCallEnded);
    };
  }, [socket, endCall]);

  // ─── Auto-start if we are the caller ────────────────────────────────────────
  useEffect(() => {
    if (isCaller) startCall();
    return cleanup;
  }, []); // eslint-disable-line

  // ─── Toggle Mic ─────────────────────────────────────────────────────────────
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(v => !v); }
  };

  // ─── Toggle Camera ───────────────────────────────────────────────────────────
  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(v => !v); }
  };

  // ─── Timer formatter ─────────────────────────────────────────────────────────
  const formatTimer = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── Avatar helper ───────────────────────────────────────────────────────────
  const remoteAvatar = remoteUser?.avatar?.url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(remoteUser?.fullName || remoteUser?.username || '?')}&background=7c3aed&color=fff&size=256`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center"
    >
      {/* ─── INCOMING CALL SCREEN ─── */}
      <AnimatePresence>
        {callState === 'incoming' && (
          <motion.div
            key="incoming"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center gap-6 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-primary-500 ring-offset-4 ring-offset-black"
            >
              <img src={remoteAvatar} className="w-full h-full object-cover" alt="" />
            </motion.div>
            <div>
              <p className="text-zinc-400 text-sm mb-1">{callType === 'video' ? '📹 Incoming video call' : '📞 Incoming audio call'}</p>
              <h2 className="text-3xl font-bold text-white">{remoteUser?.fullName || remoteUser?.username}</h2>
              <p className="text-zinc-500 text-sm mt-1">@{remoteUser?.username}</p>
            </div>
            <div className="flex gap-10 mt-4">
              <button onClick={rejectCall} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors shadow-lg shadow-red-500/30">
                  <PhoneOff size={28} className="text-white" />
                </div>
                <span className="text-zinc-400 text-sm">Decline</span>
              </button>
              <button onClick={acceptCall} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors shadow-lg shadow-green-500/30">
                  <Phone size={28} className="text-white" />
                </div>
                <span className="text-zinc-400 text-sm">Accept</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CALLING / CONNECTING / CONNECTED SCREEN ─── */}
      {callState !== 'incoming' && callState !== 'ended' && (
        <div className="relative w-full h-full flex flex-col">
          {/* Remote video (full screen) */}
          {callType === 'video' ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover bg-dark-800"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-dark-800 to-black">
              <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary-500/50 mb-6">
                <img src={remoteAvatar} className="w-full h-full object-cover" alt="" />
              </div>
              <h2 className="text-2xl font-bold text-white">{remoteUser?.fullName || remoteUser?.username}</h2>
              <div className="flex items-center gap-2 mt-2 text-zinc-400">
                <Volume2 size={16} />
                <span className="text-sm">Audio call</span>
              </div>
            </div>
          )}

          {/* Status overlay */}
          <div className="absolute top-6 left-0 w-full flex flex-col items-center z-10 pointer-events-none">
            {callState === 'calling' && (
              <div className="bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full">
                <p className="text-white text-sm font-medium animate-pulse">
                  Calling {remoteUser?.fullName || remoteUser?.username}...
                </p>
              </div>
            )}
            {callState === 'connecting' && (
              <div className="bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full">
                <p className="text-white text-sm font-medium animate-pulse">Connecting...</p>
              </div>
            )}
            {callState === 'connected' && (
              <div className="bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-white text-sm font-mono">{formatTimer(callTimer)}</p>
              </div>
            )}
          </div>

          {/* Local video (picture-in-picture) */}
          {callType === 'video' && (
            <motion.div
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              className="absolute top-6 right-6 w-32 h-44 rounded-2xl overflow-hidden bg-dark-400 border-2 border-white/20 shadow-2xl z-20 cursor-grab"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!camOn ? 'invisible' : ''}`}
              />
              {!camOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-400">
                  <VideoOff size={24} className="text-zinc-500" />
                </div>
              )}
            </motion.div>
          )}

          {/* Hidden local audio (audio-only calls) */}
          {callType === 'audio' && <video ref={localVideoRef} autoPlay muted playsInline className="hidden" />}

          {/* Controls bar */}
          <div className="absolute bottom-10 left-0 w-full flex justify-center gap-5 z-20">
            <button
              onClick={toggleMic}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg ${micOn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-red-500 text-white'}`}
            >
              {micOn ? <Mic size={22} /> : <MicOff size={22} />}
            </button>

            {callType === 'video' && (
              <button
                onClick={toggleCam}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg ${camOn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-red-500 text-white'}`}
              >
                {camOn ? <Video size={22} /> : <VideoOff size={22} />}
              </button>
            )}

            <button
              onClick={() => endCall(true)}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors shadow-lg shadow-red-500/40"
            >
              <PhoneOff size={26} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ─── CALL ENDED ─── */}
      {callState === 'ended' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-2">
            <PhoneOff size={28} className="text-zinc-400" />
          </div>
          <p className="text-white text-xl font-bold">Call ended</p>
          {callTimer > 0 && <p className="text-zinc-500 text-sm">Duration: {formatTimer(callTimer)}</p>}
        </motion.div>
      )}
    </motion.div>
  );
}
