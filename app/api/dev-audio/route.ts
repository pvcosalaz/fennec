// Dev-only endpoint: returns a silent 30-second WAV audio for UI testing
// Used by /dev-ui to preview AudioModule without real tracks

export const dynamic = 'force-static';

function createSilentWav(durationSeconds: number): Buffer {
  const sampleRate = 44100;
  const channels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * channels * bytesPerSample;
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);               // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);                // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(channels, 22);         // NumChannels
  buffer.writeUInt32LE(sampleRate, 24);       // SampleRate
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(channels * bytesPerSample, 32);              // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);    // BitsPerSample

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Fill with silence (zeros)
  for (let i = 0; i < 44 + dataSize; i++) {
    if (i < 44) continue; // Skip header
    buffer[i] = 0;
  }

  return buffer;
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }

  const wav = createSilentWav(45); // 45 seconds of silence
  return new Response(Buffer.from(wav), {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': wav.length.toString(),
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
