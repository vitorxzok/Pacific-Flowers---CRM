import OpenAI from 'openai';
import { toFile } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'missing-key',
});

export async function transcribeAudio(base64Audio: string, mimeType: string = 'audio/ogg'): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64Audio, 'base64');
    
    // Determine extension based on mimeType (whatsapp usually sends ogg)
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : 'ogg';
    const fileName = `audio.${ext}`;

    const file = await toFile(buffer, fileName, { type: mimeType });
    
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'pt', // Assuming Portuguese for this context
    });

    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return null;
  }
}

export async function generateAudio(text: string): Promise<string | null> {
  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // Can be alloy, echo, fable, onyx, nova, or shimmer
      input: text,
      response_format: 'mp3',
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer.toString('base64');
  } catch (error) {
    console.error('Error generating audio:', error);
    return null;
  }
}
