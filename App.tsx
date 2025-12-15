import React, { useRef, useEffect, useState } from 'react';
import VideoStage from './components/VideoStage';
import ControlBar from './components/ControlBar';
import { useLiveSession } from './hooks/useLiveSession';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');
  
  const { 
    connect, 
    disconnect, 
    status, 
    messages, 
    volume,
    isRecording,
    startRecording,
    stopRecording,
    recordings,
    sendTextMessage
  } = useLiveSession(videoRef);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim() && status === 'connected') {
      sendTextMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f11] text-gray-100 flex flex-col items-center py-8 px-4 font-sans">
      {/* Header */}
      <header className="mb-8 text-center space-y-2">
        <div className="inline-block p-3 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-500 mb-2 shadow-lg shadow-amber-900/40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
        </div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-500">
          FretMaster AI (Hindi)
        </h1>
        <p className="text-gray-400 max-w-md mx-auto">
          India's first AI percussive fingerstyle tutor. Instant rhythm demos & live feedback.
        </p>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Video & Controls */}
        <div className="flex-[2] flex flex-col">
          <VideoStage ref={videoRef} />
          <ControlBar 
            status={status} 
            onConnect={connect} 
            onDisconnect={disconnect} 
            volume={volume}
            isRecording={isRecording}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />
        </div>

        {/* Right Column: Feedback & Recordings */}
        <div className="flex-1 flex flex-col gap-6 h-[600px]">
            
            {/* Feedback Log with Chat Input */}
            <div className="bg-[#1e1e24] rounded-xl border border-gray-700 flex flex-col shadow-xl flex-1 overflow-hidden">
                <div className="p-4 border-b border-gray-700 bg-[#25252b]">
                    <h3 className="text-lg font-semibold text-amber-500 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Live Feedback (Hindi)
                    </h3>
                </div>
                
                <div 
                    ref={logContainerRef}
                    className="flex-1 bg-black/40 p-4 font-mono text-sm overflow-y-auto scrollbar-thin space-y-4"
                >
                    {messages.length === 0 ? (
                         <div className="text-gray-500 italic text-center mt-10">
                            {status === 'disconnected' && "Start Tutor pe click karein..."}
                            {status === 'connecting' && "Connection jod raha hoon..."}
                            {status === 'connected' && "Namaste! Kuch play karke dikhaiye."}
                         </div>
                    ) : (
                        messages.map((msg, idx) => (
                           <div key={idx} className={`flex flex-col ${msg.role === 'model' ? 'items-start' : 'items-end'}`}>
                               <div className={`max-w-[90%] rounded-lg p-3 ${
                                   msg.role === 'model' 
                                   ? 'bg-amber-900/30 text-amber-100 border border-amber-800/50' 
                                   : 'bg-blue-900/30 text-blue-100 border border-blue-800/50'
                               }`}>
                                   <div className="text-[10px] font-bold uppercase opacity-60 mb-1">
                                       {msg.role === 'user' ? 'Aap' : 'Guru Ji'}
                                   </div>
                                   <p className="whitespace-pre-wrap">{msg.text}</p>
                               </div>
                           </div>
                        ))
                    )}
                </div>

                {/* Text Input Area */}
                <div className="p-3 bg-[#25252b] border-t border-gray-700">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={status === 'connected' ? "Type a question about scales, chords..." : "Connect to chat..."}
                            disabled={status !== 'connected'}
                            className="flex-1 bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={status !== 'connected' || !inputText.trim()}
                            className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Recordings Section */}
            <div className="bg-[#1e1e24] rounded-xl border border-gray-700 p-4 h-1/3 flex flex-col">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Your Performances</h3>
                <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
                    {recordings.length === 0 ? (
                        <p className="text-gray-600 text-xs italic text-center py-4">No recordings yet. Hit 'Record' during your session.</p>
                    ) : (
                        recordings.map((rec) => (
                            <div key={rec.id} className="flex items-center justify-between bg-black/20 p-2 rounded hover:bg-black/40 transition">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-300">Session {rec.timestamp.toLocaleTimeString()}</span>
                                    <span className="text-[10px] text-gray-500">{rec.duration.toFixed(1)}s</span>
                                </div>
                                <a 
                                    href={rec.url} 
                                    download={`fretmaster-jam-${rec.id}.webm`}
                                    className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </a>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}

export default App;