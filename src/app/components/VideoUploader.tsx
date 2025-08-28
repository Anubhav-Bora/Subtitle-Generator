'use client'

import { useCallback, useState } from 'react'

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

interface VideoUploaderProps {
  onVideoUploaded: (video: { video: Video; publicUrl: string }) => void
  disabled?: boolean
}

export default function VideoUploader({ onVideoUploaded, disabled }: VideoUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFile = useCallback(async (file: File) => {
    if (disabled || uploading) return

    if (file.size > 100 * 1024 * 1024) {
      alert('File size must be less than 100MB')
      return
    }

    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid video file')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('video', file)

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 10
        })
      }, 500)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      setTimeout(() => {
        onVideoUploaded(result)
      }, 500)

    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload video. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [onVideoUploaded, disabled, uploading])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
        
    const files = Array.from(e.dataTransfer.files)
    const videoFile = files.find(file => file.type.startsWith('video/'))
        
    if (videoFile) {
      handleFile(videoFile)
    } else {
      alert('Please upload a valid video file')
    }
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  return (
    <div className="space-y-6">
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
          ${dragOver 
            ? 'border-purple-400 bg-purple-500/10 scale-105' 
            : 'border-white/30 hover:border-white/50 hover:bg-white/5'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${uploading ? 'cursor-wait' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled && !uploading) {
            setDragOver(true)
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => {
          if (!disabled && !uploading) {
            document.getElementById('video-input')?.click()
          }
        }}
      >
        <input
          id="video-input"
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={disabled || uploading}
        />

        {uploading ? (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
              <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Uploading Video...
              </h3>
              <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-gray-300">
                {Math.round(uploadProgress)}% complete
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-200">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {dragOver ? 'Drop your video here!' : 'Upload Your Video'}
              </h3>
              <p className="text-gray-300 text-lg mb-4">
                Drag and drop or click to browse
              </p>
              
              <div className="inline-flex items-center bg-white/10 rounded-full px-4 py-2 border border-white/20">
                <span className="text-sm text-gray-200">
                  Supports: MP4, MOV, AVI, WebM • Max 100MB
                </span>
              </div>
            </div>

            <div className="flex justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse animation-delay-200"></div>
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse animation-delay-400"></div>
            </div>
          </div>
        )}

        {dragOver && !uploading && (
          <div className="absolute inset-0 bg-purple-500/20 rounded-2xl border-2 border-purple-400 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📥</span>
              </div>
              <p className="text-xl font-bold text-white">Drop it like it&apos;s hot! 🔥</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4 text-center">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-2xl mb-2">⚡</div>
          <h4 className="font-bold text-white mb-1">Fast Processing</h4>
          <p className="text-gray-300 text-sm">AI-powered transcription in minutes</p>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-2xl mb-2">🎯</div>
          <h4 className="font-bold text-white mb-1">High Accuracy</h4>
          <p className="text-gray-300 text-sm">Advanced speech recognition technology</p>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-2xl mb-2">🔒</div>
          <h4 className="font-bold text-white mb-1">Secure & Private</h4>
          <p className="text-gray-300 text-sm">Your videos are processed securely</p>
        </div>
      </div>

      <style jsx>{`
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  )
}