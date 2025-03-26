
import React from 'react';

interface LoadingScreenProps {
  progress?: number; // Optional progress percentage (0-100)
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50 animate-fade-in">
      <div className="w-24 h-24 relative mb-8">
        <div className="absolute inset-0 border-t-2 border-r-2 border-transparent border-primary rounded-full animate-spin" 
             style={{ animationDuration: '1s' }}></div>
        <div className="absolute inset-2 border-t-2 border-l-2 border-transparent border-blue-400 rounded-full animate-spin"
             style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
        <div className="absolute inset-4 border-b-2 border-r-2 border-transparent border-blue-300 rounded-full animate-spin"
             style={{ animationDuration: '2s' }}></div>
      </div>
      
      <h2 className="text-2xl font-medium mb-2 animate-pulse-light">Loading Dictionary</h2>
      
      {progress !== undefined && (
        <div className="w-64 bg-muted rounded-full overflow-hidden h-2 mb-1">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      
      <p className="text-muted-foreground text-sm">
        {progress !== undefined 
          ? `${Math.round(progress)}% complete` 
          : "Preparing your reading experience..."}
      </p>
      
      <p className="mt-8 text-xs text-muted-foreground max-w-xs text-center">
        First load might take a moment to download the dictionary for offline use
      </p>
    </div>
  );
};

export default LoadingScreen;
