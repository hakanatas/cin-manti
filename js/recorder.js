/**
 * Records the WebGL canvas with MediaRecorder at a fixed square size.
 * Prefers MP4 (H.264) when the browser can encode it, falls back to WebM.
 */
export class BiteRecorder {
  constructor(canvas) {
    this.canvas = canvas;
    this.recorder = null;
    this.stream = null;
    this.track = null;
    this.chunks = [];
    this.manualFrames = false;
  }

  static get supported() {
    return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }

  static pickMime() {
    const candidates = [
      ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'mp4'],
      ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
      ['video/mp4;codecs=avc1', 'mp4'],
      ['video/mp4', 'mp4'],
      ['video/webm;codecs=vp9,opus', 'webm'],
      ['video/webm;codecs=vp9', 'webm'],
      ['video/webm;codecs=vp8,opus', 'webm'],
      ['video/webm;codecs=vp8', 'webm'],
      ['video/webm', 'webm'],
    ];
    for (const [mime, ext] of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  /** @param {MediaStreamTrack|null} audioTrack optional synthesized audio */
  start(audioTrack = null) {
    const choice = BiteRecorder.pickMime();
    if (!choice) throw new Error('No supported video format');
    this.choice = choice;
    let stream;
    try {
      stream = this.canvas.captureStream(0);
      this.track = stream.getVideoTracks()[0];
      this.manualFrames = typeof this.track.requestFrame === 'function';
      if (!this.manualFrames) {
        stream = this.canvas.captureStream(30);
        this.track = stream.getVideoTracks()[0];
      }
    } catch {
      stream = this.canvas.captureStream(30);
      this.track = stream.getVideoTracks()[0];
      this.manualFrames = false;
    }
    if (audioTrack) {
      try {
        stream = new MediaStream([this.track, audioTrack]);
      } catch {
        /* video only */
      }
    }
    this.stream = stream;
    this.chunks = [];
    this.recorder = new MediaRecorder(stream, { mimeType: choice.mime, videoBitsPerSecond: 9_000_000, audioBitsPerSecond: 128_000 });
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) this.chunks.push(e.data);
    };
    this.recorder.start(250);
    return choice;
  }

  /** Call once per rendered frame while recording (30 fps pacing is done by the caller). */
  frame() {
    if (this.manualFrames && this.track) this.track.requestFrame();
  }

  stop() {
    return new Promise((resolve) => {
      const rec = this.recorder;
      if (!rec) {
        resolve(null);
        return;
      }
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.choice.mime.split(';')[0] });
        this.stream?.getTracks().forEach((t) => t.stop());
        this.recorder = null;
        this.stream = null;
        resolve({ blob, ...this.choice });
      };
      rec.state === 'inactive' ? rec.onstop() : rec.stop();
    });
  }
}
