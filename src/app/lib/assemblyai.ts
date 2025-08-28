import { AssemblyAI } from 'assemblyai'

const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!
})

interface TranscriptWord {
  text: string
  start: number
  end: number
}

interface TranscriptResult {
  status: string
  text?: string
  words?: TranscriptWord[]
}

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const transcript = await assemblyai.transcripts.create({
    audio_url: audioUrl,
    language_detection: true,
  })

  return transcript.id
}

export async function getTranscriptionStatus(transcriptId: string): Promise<TranscriptResult> {
  const transcript = await assemblyai.transcripts.get(transcriptId)
  return {
    status: transcript.status,
    text: transcript.text??'',
    words: transcript.words as TranscriptWord[]
  }
}

export function generateSRT(words: TranscriptWord[]): string {
  if (!words || words.length === 0) return ''

  let srtContent = ''
  let segmentIndex = 1
  let currentSegment: TranscriptWord[] = []
  let segmentStartTime = 0

  const SEGMENT_DURATION = 5000

  for (let i = 0; i < words.length; i++) {
    const word = words[i]

    if (currentSegment.length === 0) {
      segmentStartTime = word.start
    }

    currentSegment.push(word)

    const segmentDuration = word.end - segmentStartTime
    if (segmentDuration >= SEGMENT_DURATION || i === words.length - 1) {
      const startTime = formatTime(segmentStartTime)
      const endTime = formatTime(word.end)
      const text = currentSegment.map(w => w.text).join(' ')

      srtContent += `${segmentIndex}\n`
      srtContent += `${startTime} --> ${endTime}\n`
      srtContent += `${text}\n\n`

      segmentIndex++
      currentSegment = []
    }
  }

  return srtContent
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const ms = milliseconds % 1000

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms
    .toString()
    .padStart(3, '0')}`
}