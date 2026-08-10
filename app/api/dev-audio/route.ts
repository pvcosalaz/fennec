// Dev-only endpoint: returns a 45-second WAV for UI testing (404 in prod).
// Default is silent (used by /dev-ui to preview AudioModule without real
// tracks). Pass ?tone=1 for a frequency-sweeping tone so the desktop tape's
// audio-reactive waveform can be verified without a real upload.

export const dynamic = 'force-dynamic';

const SAMPLE_RATE = 44100;
const CHANNELS = 2;
const BITS = 16;
const BYTES_PER_SAMPLE = BITS / 8;

function wavHeader(dataSize: number): Buffer {
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);                                       // PCM
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE, 28);
  buffer.writeUInt16LE(CHANNELS * BYTES_PER_SAMPLE, 32);
  buffer.writeUInt16LE(BITS, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

/** durationSeconds of silence (zeros). */
function createSilentWav(durationSeconds: number): Buffer {
  const dataSize = SAMPLE_RATE * durationSeconds * CHANNELS * BYTES_PER_SAMPLE;
  return Buffer.concat([wavHeader(dataSize), Buffer.alloc(dataSize)]);
}

/** durationSeconds of a looping frequency sweep with a breathing envelope,
 *  so the reel's per-bar frequency reaction is visible while verifying. */
function createToneWav(durationSeconds: number): Buffer {
  const numSamples = SAMPLE_RATE * durationSeconds;
  const dataSize = numSamples * CHANNELS * BYTES_PER_SAMPLE;
  const data = Buffer.alloc(dataSize);
  let phase = 0;
  for (let n = 0; n < numSamples; n++) {
    const t = n / SAMPLE_RATE;
    const sweep = (t % 6) / 6;                    // 0..1 every 6s
    const freq = 120 + 3380 * sweep;              // 120 Hz → 3.5 kHz
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = 0.28 * (0.55 + 0.45 * Math.sin(t * 1.7)); // slow breathing
    const s = Math.max(-1, Math.min(1, Math.sin(phase) * env));
    const v = Math.round(s * 32767);
    const off = n * CHANNELS * BYTES_PER_SAMPLE;
    data.writeInt16LE(v, off);
    data.writeInt16LE(v, off + BYTES_PER_SAMPLE);
  }
  return Buffer.concat([wavHeader(dataSize), data]);
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }

  const tone = new URL(request.url).searchParams.get('tone') === '1';
  const wav = tone ? createToneWav(45) : createSilentWav(45);

  const headers: Record<string, string> = {
    'Content-Type': 'audio/wav',
    'Cache-Control': 'no-store',
    // The tape's <audio> carries crossOrigin="anonymous" so the AnalyserNode
    // can read samples. Without this header the browser still PLAYS the file
    // but hands the analyser nothing but zeros — the VU needles and the
    // audio-reactive background sat dead while the sound was clearly running
    // (2026-08-05). Dev-only route: it 404s in production above.
    'Access-Control-Allow-Origin': '*',
    // Sin Accept-Ranges + 206, el navegador deja `audio.seekable` en [0,0] y
    // se NIEGA a buscar: escribir currentTime no hace nada y el timeupdate
    // siguiente lo devuelve a 0. Con eso, el harness no podia verificar el
    // clic para navegar ni el rebobinado — parecian rotos estando bien
    // (2026-08-10). Un fichero real de Supabase sí sirve rangos; esto solo
    // pone al mock a la par.
    'Accept-Ranges': 'bytes',
  };

  const range = request.headers.get('range');
  const m = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (m) {
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? Math.min(parseInt(m[2], 10), wav.length - 1) : wav.length - 1;
    if (start >= wav.length || start > end) {
      return new Response(null, {
        status: 416,
        headers: { ...headers, 'Content-Range': `bytes */${wav.length}` },
      });
    }
    const trozo = wav.subarray(start, end + 1);
    return new Response(Buffer.from(trozo), {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${wav.length}`,
        'Content-Length': trozo.length.toString(),
      },
    });
  }

  return new Response(Buffer.from(wav), {
    headers: { ...headers, 'Content-Length': wav.length.toString() },
  });
}
