import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TranscriptionWithVideo } from '@/app/lib/supabase'
import { processVideoWithSubtitles } from '@/app/lib/VideoProcessor'

export async function POST(request: NextRequest) {
  try {
    const { transcriptionId, subtitleStyle } = await request.json()

    
    const { data: transcription, error: transcriptionError } = await supabaseAdmin
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


    await supabaseAdmin
      .from('transcriptions')
      .update({ processing_status: 'processing' })
      .eq('id', transcriptionId)

    
    const { data: videoUrlData } = supabaseAdmin.storage
      .from('videos')
      .getPublicUrl(transcriptionWithVideo.videos.storage_path)

    
    const processedVideoBase64 = await processVideoWithSubtitles({
      videoUrl: videoUrlData.publicUrl,
      srtContent: transcriptionWithVideo.srt_content,
      outputFormat: 'mp4',
      subtitleStyle
    })


    const processedVideoBuffer = Buffer.from(processedVideoBase64, 'base64')
    const processedFilename = `processed_${transcriptionWithVideo.videos.filename}`
    const processedPath = `processed-videos/${processedFilename}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('processed-videos')
      .upload(processedPath, processedVideoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Failed to upload processed video: ${uploadError.message}`)
    }

    
    await supabaseAdmin
      .from('videos')
      .update({ processed_video_path: processedPath })
      .eq('id', transcriptionWithVideo.video_id)

    await supabaseAdmin
      .from('transcriptions')
      .update({ 
        processing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptionId)


    const { data: processedUrlData } = supabaseAdmin.storage
      .from('processed-videos')
      .getPublicUrl(processedPath)

    return NextResponse.json({
      success: true,
      processedVideoUrl: processedUrlData.publicUrl
    })

  } catch (error) {
    console.error('Video processing error:', error)
    

    const { transcriptionId } = await request.json().catch(() => ({}))
    if (transcriptionId) {
      await supabaseAdmin
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

    const { data: transcription, error } = await supabaseAdmin
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


    const processingStatus = transcription.processing_status
    const videoData = Array.isArray(transcription.videos) ? transcription.videos[0] : transcription.videos
    
    let processedVideoUrl = null
    if (videoData?.processed_video_path) {
      const { data: urlData } = supabaseAdmin.storage
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