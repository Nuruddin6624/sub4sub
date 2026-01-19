import React, { useState, useEffect, useRef } from 'react';
import { User, ChannelTask } from '../types';
import { api } from '../services/supabase';
import { ExternalLink, CheckCircle, AlertTriangle, Upload, Play, Lock, Camera, Search } from 'lucide-react';

interface EarnProps {
  user: User;
  refreshUser: () => void;
}

const Earn: React.FC<EarnProps> = ({ user, refreshUser }) => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<ChannelTask[]>([]);
  const [currentTask, setCurrentTask] = useState<ChannelTask | null>(null);
  
  // Task States
  const [status, setStatus] = useState<'IDLE' | 'WATCHING' | 'ACTION_REQUIRED' | 'UPLOADING' | 'PENDING' | 'SUCCESS' | 'SEARCHING'>('IDLE');
  const [timeLeft, setTimeLeft] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [hasClickedAction, setHasClickedAction] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<string | null>(null);

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTasks();
    // Monitor Tab Switching
    const handleVisibilityChange = () => {
        if (document.hidden && status === 'WATCHING') {
             // User left the screen
             if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
             setWarning("Paused! You must stay on this screen to earn coins.");
        } else if (!document.hidden && status === 'WATCHING') {
            // User came back - Resume
            startTimer(timeLeft); 
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, timeLeft]);

  const loadTasks = async () => {
    setLoading(true);
    const apiTasks = await api.getTasks(user.id);
    setTasks(apiTasks);
    if (apiTasks.length > 0) {
      setCurrentTask(apiTasks[0]);
      setTimeLeft(apiTasks[0].duration);
    }
    setLoading(false);
  };

  const startTimer = (duration: number) => {
    setWarning(null);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                setStatus('ACTION_REQUIRED'); // Timer done, now they must subscribe
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
  };

  const startTask = () => {
    if (!currentTask) return;
    setStatus('WATCHING');
    startTimer(currentTask.duration);
  };

  const performExternalAction = () => {
      if (!currentTask) return;
      
      // Open the channel for them to subscribe/comment
      // Adding sub_confirmation=1 to prompt subscription immediately
      const url = currentTask.channelUrl.includes('?') 
        ? `${currentTask.channelUrl}&sub_confirmation=1` 
        : `${currentTask.channelUrl}?sub_confirmation=1`;
        
      window.open(url, '_blank');
      setHasClickedAction(true);
      setStatus('UPLOADING'); // Now allow them to upload
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Convert to base64 for mock storage
          const reader = new FileReader();
          reader.onloadend = () => {
              setScreenshotFile(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const submitProof = async () => {
    if (!currentTask || !screenshotFile) return;

    setStatus('PENDING');
    setWarning(null);

    // Simulated Network Delay
    await new Promise(r => setTimeout(r, 1000));

    const success = await api.submitProof(user, currentTask, screenshotFile);

    if (success) {
      setStatus('SUCCESS');
      
      // Simulate "Searching next task" for realism (Anti-Bot)
      setTimeout(() => {
        setStatus('SEARCHING');
        
        // Random delay between 3 to 6 seconds
        const randomDelay = Math.floor(Math.random() * 3000) + 3000;
        
        setTimeout(() => {
            const remaining = tasks.filter(t => t.id !== currentTask.id);
            setTasks(remaining);
            const next = remaining.length > 0 ? remaining[0] : null;
            setCurrentTask(next);
            if(next) {
                setTimeLeft(next.duration);
            }
            
            setStatus('IDLE');
            setWarning(null);
            setHasClickedAction(false);
            setScreenshotFile(null);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }, randomDelay);

      }, 1500);

    } else {
      setWarning("Failed to submit proof. Try again.");
      setStatus('UPLOADING');
    }
  };

  const skipTask = () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      const remaining = tasks.filter(t => t.id !== currentTask?.id);
      setTasks(remaining);
      const next = remaining.length > 0 ? remaining[0] : null;
      setCurrentTask(next);
      if(next) setTimeLeft(next.duration);
      setStatus('IDLE');
      setWarning(null);
      setHasClickedAction(false);
      setScreenshotFile(null);
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen pb-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>;
  }

  if (status === 'SEARCHING') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center pb-24 bg-gray-50">
            <div className="relative mb-4">
                <div className="absolute inset-0 bg-brand-200 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-white p-4 rounded-full shadow-lg text-brand-500">
                    <Search size={32} />
                </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 animate-pulse">Searching next channel...</h2>
            <p className="text-sm text-gray-400 mt-2">Connecting to secure server</p>
        </div>
      );
  }

  if (!currentTask) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center pb-24">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">All caught up!</h2>
        <p className="text-gray-500 mt-2">There are no more channels to interact with right now. Check back later.</p>
        <button onClick={loadTasks} className="mt-4 text-brand-500 font-bold hover:underline">Refresh</button>
      </div>
    );
  }

  // Fallback video ID if none provided in task
  const embedId = currentTask.videoId || 'dQw4w9WgXcQ'; 

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-black">
        {/* Top Bar */}
        <div className="bg-gray-900 text-white p-3 flex justify-between items-center z-10">
            <div>
                <h2 className="font-bold text-sm truncate max-w-[150px]">{currentTask.channelName}</h2>
                <span className="text-xs text-brand-400 font-mono">Reward: {currentTask.coinReward} Coins</span>
            </div>
            <button onClick={skipTask} className="text-xs text-gray-400 hover:text-white border border-gray-700 px-2 py-1 rounded">Skip</button>
        </div>

        {/* Video Area (Main Content) */}
        <div className="relative flex-grow bg-black flex items-center justify-center overflow-hidden">
            {/* YouTube Embed */}
            <div className={`w-full h-full transition-opacity duration-500 ${status === 'IDLE' ? 'opacity-50' : 'opacity-100'}`}>
                <iframe 
                    key={`${currentTask.id}-${status}`} // Force re-render on status change to ensure autoplay triggers
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${embedId}?autoplay=${status === 'WATCHING' ? 1 : 0}&controls=1&rel=0&modestbranding=1&playsinline=1`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="" // Removed pointer-events-none to allow user interaction if autoplay fails
                ></iframe>
            </div>

            {/* OVERLAY: IDLE State */}
            {status === 'IDLE' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                    <button 
                        onClick={startTask}
                        className="bg-brand-600 hover:bg-brand-500 text-white rounded-full p-6 shadow-[0_0_30px_rgba(14,165,233,0.5)] transform hover:scale-105 transition"
                    >
                        <Play size={48} fill="currentColor" />
                    </button>
                </div>
            )}

            {/* OVERLAY: Timer (Always visible during WATCHING) */}
            {status === 'WATCHING' && (
                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur border border-brand-500/50 text-white px-4 py-2 rounded-full font-mono text-xl font-bold shadow-lg z-30 flex items-center gap-2 pointer-events-none">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    {timeLeft}s
                </div>
            )}

            {/* OVERLAY: Paused Warning */}
            {warning && (
                <div className="absolute inset-0 bg-black/80 z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                    <AlertTriangle className="text-yellow-500 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">Warning</h3>
                    <p className="text-gray-300 mb-6">{warning}</p>
                    {status === 'WATCHING' && (
                        <button onClick={() => setWarning(null)} className="bg-white text-black px-6 py-2 rounded-full font-bold">
                            Resume
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* Bottom Control Panel */}
        <div className="bg-white p-4 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20">
            {/* Status Message */}
            <div className="text-center mb-4">
                {status === 'WATCHING' && (
                    <p className="text-gray-600 text-sm animate-pulse">Watching video... Do not switch tabs.</p>
                )}
                {status === 'ACTION_REQUIRED' && (
                    <p className="text-red-600 text-sm font-bold animate-pulse">Watch complete! Go to channel, subscribe & take a screenshot.</p>
                )}
                {status === 'UPLOADING' && (
                    <p className="text-brand-600 text-sm font-bold">Upload screenshot proof to claim coins.</p>
                )}
                 {status === 'SUCCESS' && (
                    <p className="text-green-600 text-sm font-bold">Proof Sent! Admin will verify shortly.</p>
                )}
            </div>

            {/* Buttons */}
            <div className="space-y-3">
                {/* 1. Subscribe Button */}
                {(status === 'WATCHING' || status === 'IDLE' || status === 'ACTION_REQUIRED') && (
                    <button 
                        onClick={performExternalAction}
                        disabled={status !== 'ACTION_REQUIRED'}
                        className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center space-x-2 transition border-2 ${
                            status === 'ACTION_REQUIRED'
                            ? 'bg-red-600 border-red-600 text-white shadow-lg hover:bg-red-700 animate-pulse-fast' 
                            : 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {status === 'WATCHING' ? <Lock size={18}/> : <ExternalLink size={18}/>}
                        <span>
                            {status === 'WATCHING' ? `Wait ${timeLeft}s` : `Step 1: ${currentTask.requiredAction}`}
                        </span>
                    </button>
                )}

                {/* 2. Upload Proof Section */}
                {(status === 'UPLOADING' || status === 'PENDING' || status === 'SUCCESS') && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                        <input 
                            type="file" 
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        
                        {!screenshotFile && status === 'UPLOADING' && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3 border-2 border-dashed border-brand-300 bg-brand-50 text-brand-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-100 transition"
                            >
                                <Camera size={20} />
                                Upload Screenshot
                            </button>
                        )}

                        {screenshotFile && status === 'UPLOADING' && (
                            <div className="relative rounded-lg overflow-hidden h-32 bg-gray-100 border border-gray-200">
                                <img src={screenshotFile} alt="Preview" className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => setScreenshotFile(null)} 
                                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                                >
                                    <AlertTriangle size={12}/>
                                </button>
                            </div>
                        )}

                        <button 
                            onClick={submitProof}
                            disabled={!screenshotFile || status !== 'UPLOADING'}
                            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center space-x-2 transition ${
                                screenshotFile && status === 'UPLOADING'
                                ? 'bg-green-600 text-white shadow-lg hover:bg-green-700' 
                                : status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {status === 'PENDING' 
                                ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"/> 
                                : status === 'SUCCESS' 
                                    ? <CheckCircle size={20}/> 
                                    : <Upload size={20}/>
                            }
                            <span>
                                {status === 'SUCCESS' ? 'Sent for Review' : 'Step 2: Submit Proof'}
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Earn;