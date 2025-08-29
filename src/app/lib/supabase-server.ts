// This file should ONLY be imported in API routes (server-side)
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceKey) {
  console.error('Environment variables available:', Object.keys(process.env).filter(key => key.startsWith('SUPABASE')))
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Re-export types for convenience
export type {
  Video,
  VideoInsert,
  VideoUpdate,
  Transcription,
  TranscriptionInsert,
  TranscriptionUpdate,
  TranscriptionWithVideo,
  TranscriptionProcessingStatus
} from './supabase'