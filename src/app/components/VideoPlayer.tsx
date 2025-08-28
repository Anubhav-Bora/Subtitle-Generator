'use client'

import { useEffect, useRef, useState } from 'react'

interface VideoPlayerProps {
  videoUrl: string
  srtUrl?: string
  className?: string
}

export default function VideoPlayer({ videoUrl, srtUrl, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [subtitlesLoaded, setSubtitlesLoaded] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)

  useEffect(() => {
    if (videoRef.current && srtUrl) {

      const tracks = videoRef.current.querySelectorAll('track')
      tracks.forEach(track => track.remove())


      const track = document.createElement('track')
      track.kind = 'subtitles'
      track.label = 'English'
      track.srclang = 'en'
      track.src = srtUrl
      track.default = true
      
      track.addEventListener('load', () => {
        setSubtitlesLoaded(true)
      })
      
      videoRef.current.appendChild(track)
    }
  }, [srtUrl])

  return (
    <div className="relative group">
  
      <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-white/20 bg-black/20 backdrop-blur-sm">
      
        {!videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-white font-medium">Loading video...</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className={`w-full max-w-4xl transition-opacity duration-300 ${videoLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          crossOrigin="anonymous"
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoLoaded(true)} 
        >
          Your browser does not support the video tag.
        </video>

      
        {srtUrl && (
          <div className="absolute top-4 right-4 z-20">
            <div className={`
              inline-flex items-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-300
              ${subtitlesLoaded 
                ? 'bg-green-500/90 text-white border border-green-400/50' 
                : 'bg-yellow-500/90 text-white border border-yellow-400/50'
              }
              backdrop-blur-sm shadow-lg
            `}>
              <span className="mr-2">
                {subtitlesLoaded ? '✅' : '⏳'}
              </span>
              {subtitlesLoaded ? 'Subtitles Ready' : 'Loading Subtitles'}
            </div>
          </div>
        )}

      
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent h-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>


      <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white font-medium">
              {videoLoaded ? 'Video loaded successfully' : 'Loading video...'}
            </span>
          </div>
          
          {srtUrl && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 text-sm">Subtitles:</span>
              <div className={`
                w-2 h-2 rounded-full
                ${subtitlesLoaded ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}
              `}></div>
            </div>
          )}
        </div>
      </div>

    
      <style jsx>{`
        video::-webkit-media-controls-panel {
          background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.8));
        }
      `}</style>
    </div>
  )
}