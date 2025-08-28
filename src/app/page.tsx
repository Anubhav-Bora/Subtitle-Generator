'use client'

import { useState, useCallback } from 'react'
import VideoUploader from './components/VideoUploader'
import VideoPlayer from './components/VideoPlayer'

interface Video {
  id: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  storage_path: string
  created_at: string
  updated_at: string
}

interface VideoData {
  video: Video
  publicUrl: string
}

interface TranscriptionState {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  processingStatus?: 'pending' | 'processing' | 'completed' | 'error'
  srtUrl?: string
  text?: string
  processedVideoUrl?: string
}

interface SubtitleStyle {
  fontName: string
  fontSize: number
  fontColor: string
  backgroundColor: string
  outlineColor: string
  outlineWidth: number
  position: 'bottom' | 'top' | 'center'
}

export default function Home() {
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [transcription, setTranscription] = useState<TranscriptionState | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isProcessingVideo, setIsProcessingVideo] = useState(false)
  const [showVideoProcessing, setShowVideoProcessing] = useState(false)
  
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
    fontName: 'Arial',
    fontSize: 24,
    fontColor: 'white',
    backgroundColor: 'black@0.5',
    outlineColor: 'black',
    outlineWidth: 2,
    position: 'bottom'
  })

  const pollTranscription = useCallback(async (transcriptionId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/transcribe?id=${transcriptionId}`)
        const result = await response.json()

        setTranscription(prev => prev ? { ...prev, status: result.status } : null)

        if (result.status === 'completed') {
          setTranscription(prev => prev ? {
            ...prev,
            status: 'completed',
            srtUrl: result.srtUrl,
            text: result.text,
            processingStatus: 'pending'
          } : null)
          setIsProcessing(false)
          setShowVideoProcessing(true)
        } else if (result.status === 'error') {
          setIsProcessing(false)
        } else {
          setTimeout(poll, 3000)
        }
      } catch (error) {
        console.error('Polling error:', error)
        setIsProcessing(false)
      }
    }

    poll()
  }, [])

  const pollVideoProcessing = useCallback(async (transcriptionId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/process-video?id=${transcriptionId}`)
        const result = await response.json()

        setTranscription(prev => prev ? { 
          ...prev, 
          processingStatus: result.status,
          processedVideoUrl: result.processedVideoUrl
        } : null)

        if (result.status === 'completed') {
          setIsProcessingVideo(false)
        } else if (result.status === 'error') {
          setIsProcessingVideo(false)
        } else {
          setTimeout(poll, 5000)
        }
      } catch (error) {
        console.error('Video processing polling error:', error)
        setIsProcessingVideo(false)
      }
    }

    poll()
  }, [])

  const handleVideoUploaded = useCallback(async (uploadResult: VideoData) => {
    setVideoData(uploadResult)
    setIsProcessing(true)

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: uploadResult.video.id })
      })

      const result = await response.json()
      
      setTranscription({
        id: result.transcriptionId,
        status: 'processing'
      })

      pollTranscription(result.transcriptionId)
    } catch (error) {
      console.error('Transcription error:', error)
      setIsProcessing(false)
    }
  }, [pollTranscription])

  const handleProcessVideo = useCallback(async () => {
    if (!transcription) return

    setIsProcessingVideo(true)
    try {
      const response = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcriptionId: transcription.id,
          subtitleStyle
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start video processing')
      }

      setTranscription(prev => prev ? {
        ...prev,
        processingStatus: 'processing'
      } : null)

      pollVideoProcessing(transcription.id)
    } catch (error) {
      console.error('Video processing error:', error)
      setIsProcessingVideo(false)
    }
  }, [transcription, subtitleStyle, pollVideoProcessing])

  const resetApp = useCallback(() => {
    setVideoData(null)
    setTranscription(null)
    setIsProcessing(false)
    setIsProcessingVideo(false)
    setShowVideoProcessing(false)
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <span className="text-2xl">🎬</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
            AI Video Subtitle Generator
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Transform your videos with AI-powered subtitles. Upload, customize, and download with embedded captions.
          </p>
        </div>

        <div className="space-y-8">
          {!videoData && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-8">
              <VideoUploader onVideoUploaded={handleVideoUploaded} />
            </div>
          )}

          {videoData && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">📹</span>
                Video Preview
              </h2>
              <div className="flex justify-center">
                <VideoPlayer
                  videoUrl={videoData.publicUrl}
                  srtUrl={transcription?.srtUrl}
                  className="border-2 border-white/30 rounded-xl"
                />
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-8 text-center">
              <div className="relative mb-6">
                <div className="animate-spin w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full mx-auto"></div>
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Generating Subtitles</h3>
              <div className="inline-flex items-center bg-white/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></div>
                <span className="text-gray-200 font-medium">
                  Status: {transcription?.status || 'Starting...'}
                </span>
              </div>
            </div>
          )}

          {transcription?.status === 'completed' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
                <span className="mr-3">⚙️</span>
                Subtitle Options
              </h2>
              
              <div className="grid lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="mr-2">💾</span>
                    Download Files
                  </h3>
                  <a
                    href={transcription.srtUrl}
                    download
                    className="group bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <span className="text-lg">📄</span>
                    <span>Download SRT File</span>
                    <span className="opacity-70 group-hover:opacity-100 transition-opacity">→</span>
                  </a>
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="mr-2">🎨</span>
                    Embed Subtitles
                  </h3>
                  {!showVideoProcessing ? (
                    <button
                      onClick={() => setShowVideoProcessing(true)}
                      className="group bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <span className="text-lg">🎬</span>
                      <span>Customize & Embed</span>
                      <span className="opacity-70 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                        <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                          <span className="mr-2">🎨</span>
                          Subtitle Style
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-200 mb-2">Font Size</label>
                            <input
                              type="range"
                              min="16"
                              max="48"
                              value={subtitleStyle.fontSize}
                              onChange={(e) => setSubtitleStyle(prev => ({
                                ...prev,
                                fontSize: parseInt(e.target.value)
                              }))}
                              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="mt-2 text-center">
                              <span className="inline-flex items-center bg-blue-500/20 text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                                {subtitleStyle.fontSize}px
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-200 mb-2">Position</label>
                            <select
                              value={subtitleStyle.position}
                              onChange={(e) => setSubtitleStyle(prev => ({
                                ...prev,
                                position: e.target.value as 'bottom' | 'top' | 'center'
                              }))}
                              className="w-full p-3 bg-white/10 border border-white/30 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="bottom" className="bg-gray-800">Bottom</option>
                              <option value="center" className="bg-gray-800">Center</option>
                              <option value="top" className="bg-gray-800">Top</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-200 mb-2">Font Color</label>
                            <select
                              value={subtitleStyle.fontColor}
                              onChange={(e) => setSubtitleStyle(prev => ({
                                ...prev,
                                fontColor: e.target.value
                              }))}
                              className="w-full p-3 bg-white/10 border border-white/30 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="white" className="bg-gray-800">White</option>
                              <option value="yellow" className="bg-gray-800">Yellow</option>
                              <option value="red" className="bg-gray-800">Red</option>
                              <option value="blue" className="bg-gray-800">Blue</option>
                              <option value="green" className="bg-gray-800">Green</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-200 mb-2">Outline Width</label>
                            <input
                              type="range"
                              min="0"
                              max="5"
                              value={subtitleStyle.outlineWidth}
                              onChange={(e) => setSubtitleStyle(prev => ({
                                ...prev,
                                outlineWidth: parseInt(e.target.value)
                              }))}
                              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="mt-2 text-center">
                              <span className="inline-flex items-center bg-purple-500/20 text-purple-200 px-3 py-1 rounded-full text-sm font-medium">
                                {subtitleStyle.outlineWidth}px
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleProcessVideo}
                        disabled={isProcessingVideo}
                        className="group bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center space-x-3 w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none text-lg"
                      >
                        {isProcessingVideo ? (
                          <>
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            <span>Processing Video...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">🎬</span>
                            <span>Generate Video with Subtitles</span>
                            <span className="opacity-70 group-hover:opacity-100 transition-opacity">✨</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isProcessingVideo && (
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl p-6 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center mb-4">
                    <div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full mr-3"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mx-1"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mx-1 animation-delay-200"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mx-1 animation-delay-400"></div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Processing video with embedded subtitles...
                  </h3>
                  <p className="text-purple-200 text-sm">
                    This may take several minutes depending on video length
                  </p>
                </div>
              )}

              {transcription.processingStatus === 'completed' && transcription.processedVideoUrl && (
                <div className="border-t border-white/20 pt-8 mt-8">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center bg-green-500/20 text-green-200 px-4 py-2 rounded-full border border-green-400/30">
                      <span className="mr-2">✅</span>
                      <span className="font-bold">Video Ready for Download!</span>
                    </div>
                  </div>
                  
                  <div className="grid lg:grid-cols-2 gap-8">
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                        <span className="mr-2">👀</span>
                        Preview Processed Video
                      </h4>
                      <video
                        src={transcription.processedVideoUrl}
                        controls
                        className="w-full rounded-xl shadow-lg border-2 border-white/20"
                      />
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                        <span className="mr-2">📥</span>
                        Download Options
                      </h4>
                      
                      <div className="space-y-4 mb-6">
                        <a
                          href={transcription.processedVideoUrl}
                          download
                          className="group bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <span className="text-lg">📹</span>
                          <span>Video with Subtitles</span>
                          <span className="opacity-70 group-hover:opacity-100 transition-opacity">⬇️</span>
                        </a>
                        
                        <a
                          href={transcription.srtUrl}
                          download
                          className="group bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <span className="text-lg">📄</span>
                          <span>SRT File Only</span>
                          <span className="opacity-70 group-hover:opacity-100 transition-opacity">⬇️</span>
                        </a>
                      </div>

                      <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                        <h5 className="font-bold text-white mb-2 flex items-center">
                          <span className="mr-2">💎</span>
                          What You Get:
                        </h5>
                        <ul className="text-gray-200 text-sm space-y-2">
                          <li className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                            Original video with burned-in subtitles
                          </li>
                          <li className="flex items-center">
                            <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                            Separate SRT file for external use
                          </li>
                          <li className="flex items-center">
                            <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                            Custom styling applied
                          </li>
                          <li className="flex items-center">
                            <span className="w-2 h-2 bg-pink-400 rounded-full mr-3"></span>
                            Ready for social media or presentations
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center mt-8">
                <button
                  onClick={resetApp}
                  className="group bg-white/10 hover:bg-white/20 text-white border border-white/30 hover:border-white/50 px-8 py-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center space-x-3 mx-auto shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <span className="text-lg">🔄</span>
                  <span>Process Another Video</span>
                </button>
              </div>
            </div>
          )}

          {transcription?.status === 'error' && (
            <div className="bg-red-500/20 border border-red-400/40 rounded-2xl p-8 text-center backdrop-blur-sm">
              <div className="w-16 h-16 bg-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">❌</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Processing Failed</h3>
              <p className="text-red-200 mb-6 text-lg">
                There was an error processing your video. Please try again.
              </p>
              <button
                onClick={resetApp}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-4 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="mt-16 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-center text-white mb-8">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">SRT Subtitle Files</h3>
              <p className="text-gray-300 leading-relaxed">
                Standard subtitle files compatible with all video players and streaming platforms
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">🎬</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Embedded Subtitles</h3>
              <p className="text-gray-300 leading-relaxed">
                Videos with permanent subtitles burned-in, perfect for social media and presentations
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Custom Styling</h3>
              <p className="text-gray-300 leading-relaxed">
                Customize font, size, color, and position to match your brand and style preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8b5cf6, #ec4899);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8b5cf6, #ec4899);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .backdrop-blur-lg {
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        
        .backdrop-blur-sm {
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }
      `}</style>
    </main>
  )
}