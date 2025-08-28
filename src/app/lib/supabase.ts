import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export interface Video {
  id: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  storage_path: string
  processed_video_path?: string
  created_at: string
  updated_at: string
}

export interface Transcription {
  id: string
  video_id: string
  assemblyai_id: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  transcript_text?: string
  srt_content?: string
  srt_storage_path?: string
  processing_status: 'pending' | 'processing' | 'completed' | 'error'
  created_at: string
  updated_at: string
}

export interface TranscriptionWithVideo extends Transcription {
  videos: Video
}

export interface TranscriptionProcessingStatus {
  processing_status: 'pending' | 'processing' | 'completed' | 'error'
  videos: Pick<Video, 'processed_video_path'>[]
}