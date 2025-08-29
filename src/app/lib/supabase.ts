import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../lib/database.types'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY


if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

if (!supabaseServiceKey) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}


export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseAdmin: SupabaseClient<Database> = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})


export type Video = Database['public']['Tables']['videos']['Row']
export type VideoInsert = Database['public']['Tables']['videos']['Insert']
export type VideoUpdate = Database['public']['Tables']['videos']['Update']

export type Transcription = Database['public']['Tables']['transcriptions']['Row']
export type TranscriptionInsert = Database['public']['Tables']['transcriptions']['Insert']
export type TranscriptionUpdate = Database['public']['Tables']['transcriptions']['Update']

export interface TranscriptionWithVideo extends Transcription {
  videos: Video
}

export interface TranscriptionProcessingStatus {
  processing_status: 'pending' | 'processing' | 'completed' | 'error'
  videos: Pick<Video, 'processed_video_path'>[]
}