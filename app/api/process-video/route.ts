import { NextRequest, NextResponse } from 'next/server'
import { supabase, TranscriptionWithVideo } from '../../lib/supabase'
import { supabaseAdmin } from '../../lib/supabase-server'


export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const { transcriptionId, subtitleStyle } = await request.json()

    if (!transcriptionId) {
      return NextResponse.json({ error: 'Transcription ID is required' }, { status: 400 })
    }

    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select(`
        *,
        videos (*)
      `)
      .eq('id', transcriptionId)
      .single()

    if (transcriptionError || !transcription) {
      console.error('Transcription fetch error:', transcriptionError)
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 })
    }

    const transcriptionWithVideo = transcription as TranscriptionWithVideo

    if (transcriptionWithVideo.status !== 'completed' || !transcriptionWithVideo.srt_content) {
      return NextResponse.json({ error: 'Transcription not ready for processing' }, { status: 400 })
    }

    await supabase
      .from('transcriptions')
      .update({ processing_status: 'processing' })
      .eq('id', transcriptionId)

    try {

      const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME

      if (isServerless) {
        const originalVideoUrl = supabase.storage
          .from('videos')
          .getPublicUrl(transcriptionWithVideo.videos.storage_path).data.publicUrl
        await supabase
          .from('videos')
          .update({ 
            processed_video_path: transcriptionWithVideo.videos.storage_path 
          })
          .eq('id', transcriptionWithVideo.video_id ?? '')

        await supabase
          .from('transcriptions')
          .update({ 
            processing_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', transcriptionId)

        return NextResponse.json({
          success: true,
          processedVideoUrl: originalVideoUrl,
          note: 'Video processing not available in serverless environment. Use SRT file for subtitles.'
        })
      }
      const { processVideoWithSubtitles } = await import('../../lib/VideoProcessor')
      
      const { data: videoUrlData } = supabase.storage
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
      await supabase
        .from('videos')
        .update({ processed_video_path: processedPath })
        .eq('id', transcriptionWithVideo.video_id ?? '')

  
      await supabase
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

    } catch (processingError) {
      console.error('Video processing failed:', processingError)
      

      const originalVideoUrl = supabase.storage
        .from('videos')
        .getPublicUrl(transcriptionWithVideo.videos.storage_path).data.publicUrl

      await supabase
        .from('transcriptions')
        .update({ 
          processing_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptionId)

      await supabase
        .from('videos')
        .update({ 
          processed_video_path: transcriptionWithVideo.videos.storage_path
        })
        .eq('id', transcriptionWithVideo.video_id ?? '')

      return NextResponse.json({
        success: true,
        processedVideoUrl: originalVideoUrl,
        warning: 'Video processing failed, returning original video with separate SRT file'
      })
    }

  } catch (error) {
    console.error('Video processing error:', error)
    
    let transcriptionId: string | null = null
    try {
      const body = await request.clone().json()
      transcriptionId = body.transcriptionId
    } catch (parseError) {
      console.error('Could not parse request body for error handling:', parseError)
    }

  if (transcriptionId) {
  try {
    await supabase
      .from('transcriptions')
      .update({ processing_status: 'error' })
      .eq('id', transcriptionId);
  } catch (err) {
    console.error('Error updating transcription status:', err);
  }
}

    return NextResponse.json({ 
      error: 'Failed to process video',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
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
      console.error('Transcription status fetch error:', error)
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 })
    }
    const processingStatus = transcription.processing_status
    const videoData = Array.isArray(transcription.videos) ? transcription.videos[0] : transcription.videos
    
    let processedVideoUrl = null
    if (videoData?.processed_video_path) {
      let urlData
      try {
        urlData = supabaseAdmin.storage
          .from('processed-videos')
          .getPublicUrl(videoData.processed_video_path).data
      } catch (e) {
        urlData = supabaseAdmin.storage
          .from('videos')
          .getPublicUrl(videoData.processed_video_path).data
      }
      processedVideoUrl = urlData.publicUrl
    }

    return NextResponse.json({
      status: processingStatus,
      processedVideoUrl
    })

  } catch (error) {
    console.error('Processing status check error:', error)
    return NextResponse.json({ 
      error: 'Failed to check processing status',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
  }
}