import React from 'react';
import { ConnectionState } from '../types';

interface ControlBarProps {
  status: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
  volume: number;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({ 
  status, 
  onConnect, 
  onDisconnect, 
  volume,
  isRecording,
  onStartRecording,
  onStopRecording
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between bg-[#1e1e24] p-4 rounded-xl border border-gray-700 shadow-xl w-full max-w-2xl mx-auto mt-6 gap-4">
      {/* Status Indicator */}
      <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center space-x-3">
            <div className="relative w-3 h-3">
            <div className={`absolute w-full h-full rounded-full ${
                status === 'connected' ? 'bg-green-500 animate-ping' : 
                status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <div className={`absolute w-full h-full rounded-full ${
                status === 'connected' ? 'bg-green-500' : 
                status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            </div>
            <span className="text-gray-300 font-medium uppercase text-sm tracking-wider">
            {status === 'connected' ? 'AI Tutor Active' : 
            status === 'connecting' ? 'Connecting...' : 'Offline'}
            </span>
        </div>
        
        {/* Mobile Volume Meter (visible only on small screens if needed, otherwise hidden) */}
      </div>

      <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
        {/* Audio Meter */}
        <div className="flex items-end space-x-1 h-8 mx-2">
            {[...Array(5)].map((_, i) => (
                <div 
                    key={i} 
                    className={`w-1.5 rounded-sm transition-all duration-75 ${
                        volume > i * 0.2 ? 'bg-amber-500' : 'bg-gray-700'
                    }`}
                    style={{ height: `${volume > i * 0.2 ? 100 : 30}%` }}
                />
            ))}
        </div>

        {/* Recording Controls */}
        {status === 'connected' && (
            isRecording ? (
                <button
                    onClick={onStopRecording}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all animate-pulse"
                >
                    <div className="w-3 h-3 bg-white rounded-sm"></div>
                    <span>Stop Rec</span>
                </button>
            ) : (
                <button
                    onClick={onStartRecording}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-all border border-gray-600"
                >
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Record</span>
                </button>
            )
        )}

        {/* Main Connect/Disconnect */}
        {status === 'connected' || status === 'connecting' ? (
          <button
            onClick={onDisconnect}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-6 py-2 rounded-lg font-semibold transition-all whitespace-nowrap"
          >
            End
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-semibold shadow-lg shadow-amber-600/20 transition-all flex items-center space-x-2 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            <span>Start Tutor</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ControlBar;