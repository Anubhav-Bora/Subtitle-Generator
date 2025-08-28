import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { filename, originalName, fileSize, mimeType, storagePath } = await request.json()

    const { data: videoData, error: dbError } = await supabaseAdmin
      .from('videos')
      .insert({
        filename: filename,
        original_name: originalName,
        file_size: fileSize,
        mime_type: mimeType,
        storage_path: storagePath
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save video metadata' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      video: videoData
    })

  } catch (error) {
    console.error('Metadata save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}