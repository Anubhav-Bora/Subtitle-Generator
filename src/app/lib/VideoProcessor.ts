import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export interface ProcessVideoOptions {
  videoUrl: string
  srtContent: string
  outputFormat: 'mp4'
  subtitleStyle?: SubtitleStyle
}

export interface SubtitleStyle {
  fontName?: string
  fontSize?: number
  fontColor?: string
  backgroundColor?: string
  outlineColor?: string
  outlineWidth?: number
  position?: 'bottom' | 'top' | 'center'
}

const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontName: 'Arial',
  fontSize: 24,
  fontColor: 'white',
  backgroundColor: 'black@0.5',
  outlineColor: 'black',
  outlineWidth: 2,
  position: 'bottom'
}

export async function processVideoWithSubtitles(options: ProcessVideoOptions): Promise<string> {
  const { videoUrl, srtContent, outputFormat, subtitleStyle = DEFAULT_SUBTITLE_STYLE } = options
  
  // Create temporary directories
  const tempDir = path.join(process.cwd(), 'tmp')
  await fs.mkdir(tempDir, { recursive: true })
  
  const videoId = uuidv4()
  const inputVideoPath = path.join(tempDir, `input_${videoId}.mp4`)
  const srtPath = path.join(tempDir, `subtitles_${videoId}.srt`)
  const outputVideoPath = path.join(tempDir, `output_${videoId}.${outputFormat}`)
  
  try {

    const videoResponse = await fetch(videoUrl)
    const videoBuffer = await videoResponse.arrayBuffer()
    await fs.writeFile(inputVideoPath, Buffer.from(videoBuffer))
    
    
    await fs.writeFile(srtPath, srtContent)
    
    
    const normalizedSrtPath = srtPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:')
    
    
    const fontColor = hexToFFmpegColor(subtitleStyle.fontColor || 'white')
    const outlineColor = hexToFFmpegColor(subtitleStyle.outlineColor || 'black')
    const fontSize = subtitleStyle.fontSize || 24
    const outlineWidth = subtitleStyle.outlineWidth || 2
    const fontName = subtitleStyle.fontName || 'Arial'
    
    
    const subtitleFilter = `subtitles='${normalizedSrtPath}':force_style='FontName=${fontName},FontSize=${fontSize},PrimaryColour=&H${fontColor},OutlineColour=&H${outlineColor},Outline=${outlineWidth},BorderStyle=3'`
    

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg(inputVideoPath)
        .videoFilters(subtitleFilter)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-c:a', 'copy'
        ])
        .output(outputVideoPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine)
        })
        .on('progress', (progress) => {
          console.log('Processing progress:', progress.percent + '%')
        })
        .on('end', () => {
          console.log('Video processing completed')
          resolve()
        })
        .on('error', (err, stdout, stderr) => {
          console.error('FFmpeg error:', err.message)
          console.error('FFmpeg stderr:', stderr)
          reject(err)
        })
      
      command.run()
    })
    

    const processedVideoBuffer = await fs.readFile(outputVideoPath)
    

    await Promise.all([
      fs.unlink(inputVideoPath).catch(() => {}),
      fs.unlink(srtPath).catch(() => {}),
      fs.unlink(outputVideoPath).catch(() => {})
    ])
    
    return processedVideoBuffer.toString('base64')
    
  } catch (error) {

    await Promise.all([
      fs.unlink(inputVideoPath).catch(() => {}),
      fs.unlink(srtPath).catch(() => {}),
      fs.unlink(outputVideoPath).catch(() => {})
    ]).catch(() => {})
    
    throw error
  }
}

function hexToFFmpegColor(color: string): string {

  const colorMap: { [key: string]: string } = {
    'white': 'FFFFFF',
    'black': '000000',
    'red': '0000FF',    
    'green': '00FF00',  
    'blue': 'FF0000',   
    'yellow': '00FFFF', 
    'cyan': 'FFFF00',   
    'magenta': 'FF00FF' 
  }
  
  if (colorMap[color.toLowerCase()]) {
    return colorMap[color.toLowerCase()]
  }
  
  
  if (color.startsWith('#')) {
    const hex = color.substring(1).toUpperCase()
    if (hex.length === 6) {
      
      const r = hex.substring(0, 2)
      const g = hex.substring(2, 4)
      const b = hex.substring(4, 6)
      return b + g + r
    }
    return hex
  }
  

  if (color.includes('@')) {
    const [baseColor] = color.split('@')
    return hexToFFmpegColor(baseColor)
  }
  
  return 'FFFFFF' 
}