import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / (1024 * 1024);
      if (sizeMB > 50) {
        return NextResponse.json({ 
          error: 'File size exceeds 50MB limit. Please use a smaller file.' 
        }, { status: 413 });
      }
    }

    const formData = await request.formData()
    const file = formData.get('video') as File
     
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 })
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 50) {
      return NextResponse.json({ 
        error: `File size (${fileSizeMB.toFixed(1)}MB) exceeds 50MB limit.` 
      }, { status: 413 });
    }

    const fileExtension = file.name.split('.').pop()
    const uniqueFilename = `${uuidv4()}.${fileExtension}`
    const storagePath = `videos/${uniqueFilename}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('videos')
      .upload(storagePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 })
    }

    const { data: videoData, error: dbError } = await supabaseAdmin
      .from('videos')
      .insert({
        filename: uniqueFilename,
        original_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save video metadata' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('videos')
      .getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      video: videoData,
      publicUrl: urlData.publicUrl
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}