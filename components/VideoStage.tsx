import React, { forwardRef } from 'react';

const VideoStage = forwardRef<HTMLVideoElement>((props, ref) => {
  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 group">
      <video
        ref={ref}
        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror for natural feel
        autoPlay
        playsInline
        muted
      />
      
      {/* Live Status Indicator */}
      <div className="absolute top-4 left-4 flex gap-2">
         <div className="bg-red-600/90 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white font-bold font-mono flex items-center gap-2 shadow-lg animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            LIVE INPUT
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
          <p className="text-white/50 text-xs font-mono bg-black/40 inline-block px-2 py-1 rounded">
              AI is watching your hands & posture...
          </p>
      </div>
    </div>
  );
});

VideoStage.displayName = 'VideoStage';

export default VideoStage;