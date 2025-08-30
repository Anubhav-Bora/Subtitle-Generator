import { NextRequest, NextResponse } from 'next/server'
import { supabase, type VideoInsert } from '../../lib/supabase'

interface SaveVideoRequest {
  filename: string
  originalName: string
  fileSize: number
  mimeType: string
  storagePath: string
}

export async function POST(request: NextRequest) {
  try {
    const { filename, originalName, fileSize, mimeType, storagePath }: SaveVideoRequest = await request.json()

    const videoData: VideoInsert = {
      filename,
      original_name: originalName,
      file_size: fileSize,
      mime_type: mimeType,
      storage_path: storagePath
    }

    const { data: video, error: dbError } = await supabase
      .from('videos')
      .insert(videoData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save video metadata' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      video
    })

  } catch (error) {
    console.error('Metadata save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}