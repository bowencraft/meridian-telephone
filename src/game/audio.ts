type LoopName = 'rain' | 'line' | 'ring' | 'dialTone' | 'busy'

export class TelephoneAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private loops = new Map<LoopName, Array<AudioNode>>()
  muted = false

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = this.muted ? 0 : 0.52
      this.master.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') await this.context.resume()
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.master && this.context) this.master.gain.setTargetAtTime(muted ? 0 : 0.52, this.context.currentTime, 0.03)
  }

  private tone(frequency: number, duration: number, gain = 0.12, type: OscillatorType = 'sine', delay = 0) {
    if (!this.context || !this.master) return
    const start = this.context.currentTime + delay
    const oscillator = this.context.createOscillator()
    const envelope = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(envelope).connect(this.master)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }

  private noise(duration: number, gain = 0.035, delay = 0) {
    if (!this.context || !this.master) return
    const start = this.context.currentTime + delay
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration))
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const envelope = this.context.createGain()
    source.buffer = buffer
    filter.type = 'bandpass'
    filter.frequency.value = 1450
    filter.Q.value = 0.7
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.linearRampToValueAtTime(gain, start + 0.02)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.connect(filter).connect(envelope).connect(this.master)
    source.start(start)
  }

  playLift() { this.tone(138, 0.08, 0.11, 'square'); this.noise(0.07, 0.05) }
  playHangup() { this.tone(74, 0.16, 0.18, 'square'); this.tone(48, 0.12, 0.12, 'triangle', 0.035) }
  playRotaryTick() { this.tone(980 + Math.random() * 180, 0.025, 0.035, 'square') }
  playRotaryReturn(digit = '1') {
    const ticks = Math.max(3, digit === '0' ? 12 : Number(digit) + 2)
    for (let index = 0; index < ticks; index += 1) this.tone(720 + (index % 2) * 120, 0.02, 0.026, 'square', index * 0.038)
  }
  playDigit() { this.tone(540, 0.055, 0.08, 'sine') }
  playError() { this.tone(112, 0.14, 0.08, 'sawtooth') }
  playConnectNoise() { this.noise(0.72, 0.09); this.tone(1240, 0.08, 0.025, 'sine', 0.25) }
  playWhisper() { this.noise(0.6, 0.028); this.tone(180, 0.25, 0.015, 'sine', 0.08) }
  playReveal() { this.tone(420, 0.08, 0.04); this.tone(620, 0.14, 0.035, 'sine', 0.07) }

  startRing() {
    this.stopLoop('ring')
    if (!this.context || !this.master) return
    const nodes: AudioNode[] = []
    const pulse = () => {
      this.tone(820, 0.32, 0.14, 'square')
      this.tone(660, 0.34, 0.1, 'square', 0.06)
      this.tone(820, 0.32, 0.14, 'square', 0.48)
      this.tone(660, 0.34, 0.1, 'square', 0.54)
    }
    pulse()
    const id = window.setInterval(pulse, 3100)
    const marker = { disconnect: () => window.clearInterval(id) } as unknown as AudioNode
    nodes.push(marker)
    this.loops.set('ring', nodes)
  }

  startDialTone() {
    this.stopLoop('dialTone')
    this.startOscillatorLoop('dialTone', [350, 440], 0.035)
  }

  startLineNoise() {
    this.stopLoop('line')
    if (!this.context || !this.master) return
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    source.buffer = buffer
    source.loop = true
    filter.type = 'lowpass'
    filter.frequency.value = 1600
    gain.gain.value = 0.013
    source.connect(filter).connect(gain).connect(this.master)
    source.start()
    this.loops.set('line', [source, filter, gain])
  }

  private startOscillatorLoop(name: LoopName, frequencies: number[], level: number) {
    if (!this.context || !this.master) return
    const gain = this.context.createGain()
    gain.gain.value = level
    gain.connect(this.master)
    const nodes: AudioNode[] = [gain]
    frequencies.forEach((frequency) => {
      const oscillator = this.context!.createOscillator()
      oscillator.frequency.value = frequency
      oscillator.connect(gain)
      oscillator.start()
      nodes.push(oscillator)
    })
    this.loops.set(name, nodes)
  }

  stopLoop(name: LoopName) {
    const nodes = this.loops.get(name) ?? []
    nodes.forEach((node) => {
      try {
        if ('stop' in node && typeof node.stop === 'function') node.stop()
        else node.disconnect()
      } catch { /* node may already be stopped */ }
    })
    this.loops.delete(name)
  }

  stopAll() { ;(['rain', 'line', 'ring', 'dialTone', 'busy'] as LoopName[]).forEach((name) => this.stopLoop(name)) }
}
