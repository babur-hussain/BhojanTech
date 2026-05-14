import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface PageLoaderProps {
  message?: string;
  size?: number;
}

export default function PageLoader({ message, size = 220 }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[320px] w-full">
      <DotLottieReact
        src="/food-carousel.lottie"
        loop
        autoplay
        style={{ width: size, height: size }}
      />
      {message && (
        <p className="text-gray-400 text-sm font-medium mt-2 animate-pulse">{message}</p>
      )}
    </div>
  );
}
