import { NextRequest, NextResponse } from 'next/server'
import { supabase, TranscriptionWithVideo } from '@/app/lib/supabase'
import { supabaseAdmin } from '@/app/lib/supabase-server' 
import { processVideoWithSubtitles } from '@/app/lib/VideoProcessor'

export async function POST(request: NextRequest) {
  try {
    const { transcriptionId, subtitleStyle } = await request.json()

    
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select(`
        *,
        videos (*)
      `)
      .eq('id', transcriptionId)
      .single()

    if (transcriptionError || !transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 })
    }

    const transcriptionWithVideo = transcription as TranscriptionWithVideo

    if (transcriptionWithVideo.status !== 'completed' || !transcriptionWithVideo.srt_content) {
      return NextResponse.json({ error: 'Transcription not ready for processing' }, { status: 400 })
    }

    // Update processing status
    await supabase
      .from('transcriptions')
      .update({ processing_status: 'processing' })
      .eq('id', transcriptionId)

    // Get video URL
    const { data: videoUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(transcriptionWithVideo.videos.storage_path)

    // Process video with subtitles
    const processedVideoBase64 = await processVideoWithSubtitles({
      videoUrl: videoUrlData.publicUrl,
      srtContent: transcriptionWithVideo.srt_content,
      outputFormat: 'mp4',
      subtitleStyle
    })

    // Upload processed video using ADMIN CLIENT
    const processedVideoBuffer = Buffer.from(processedVideoBase64, 'base64')
    const processedFilename = `processed_${transcriptionWithVideo.videos.filename}`
    const processedPath = `processed-videos/${processedFilename}`

    const { error: uploadError } = await supabaseAdmin.storage // Use admin client
      .from('processed-videos')
      .upload(processedPath, processedVideoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Failed to upload processed video: ${uploadError.message}`)
    }

    // Update video record with processed path (using regular client is fine for DB operations if RLS allows)
    await supabase
      .from('videos')
      .update({ processed_video_path: processedPath })
      .eq('id', transcriptionWithVideo.video_id ?? '');

    // Update transcription status
    await supabase
      .from('transcriptions')
      .update({ 
        processing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptionId)

    // Get public URL for processed video
    const { data: processedUrlData } = supabaseAdmin.storage // Use admin client for consistency
      .from('processed-videos')
      .getPublicUrl(processedPath)

    return NextResponse.json({
      success: true,
      processedVideoUrl: processedUrlData.publicUrl
    })

  } catch (error) {
    console.error('Video processing error:', error)
    
    // Error handling
    const { transcriptionId } = await request.json().catch(() => ({}))
    if (transcriptionId) {
      await supabase
        .from('transcriptions')
        .update({ processing_status: 'error' })
        .eq('id', transcriptionId)
    }

    return NextResponse.json({ error: 'Failed to process video' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transcriptionId = searchParams.get('id')

    if (!transcriptionId) {
      return NextResponse.json({ error: 'Transcription ID required' }, { status: 400 })
    }

    const { data: transcription, error } = await supabase
      .from('transcriptions')
      .select(`
        processing_status,
        videos!inner (
          processed_video_path
        )
      `)
      .eq('id', transcriptionId)
      .single()

    if (error || !transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 })
    }

    // Get processing status and video data
    const processingStatus = transcription.processing_status
    const videoData = Array.isArray(transcription.videos) ? transcription.videos[0] : transcription.videos
    
    let processedVideoUrl = null
    if (videoData?.processed_video_path) {
      const { data: urlData } = supabaseAdmin.storage // Use admin client for consistent access
        .from('processed-videos')
        .getPublicUrl(videoData.processed_video_path)
      processedVideoUrl = urlData.publicUrl
    }

    return NextResponse.json({
      status: processingStatus,
      processedVideoUrl
    })

  } catch (error) {
    console.error('Processing status check error:', error)
    return NextResponse.json({ error: 'Failed to check processing status' }, { status: 500 })
  }
}