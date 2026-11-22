/**
 * Agua viva sobre fotografía real.
 * WebGL1 (compatible con Safari iOS): un solo quad a pantalla completa. La foto original se dibuja intacta
 * y solo la superficie del agua (definida por una máscara generada desde la propia foto) recibe
 * ondulación, refracción, cáusticas y brillos. La arquitectura y el paisaje no se deforman.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uTex;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform vec2 uImg;
uniform vec2 uPointer;
uniform vec2 uOffset;
uniform float uTime;
uniform float uZoom;
uniform float uIntensity;
uniform float uCaustics;
uniform vec4 uTap;     // xy = uv del toque, z = segundos desde el toque, w = fuerza
uniform float uWave;   // onda global extra (transiciones)

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// cáusticas iterativas (patrón de luz que el sol dibuja en el fondo de una pileta)
float caustic(vec2 p, float t){
  vec2 i = p; float c = 1.0; float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0; c = 1.17 - pow(max(c, 0.0), 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.0);
}
vec2 cover(vec2 uv){
  float rs = uRes.x / uRes.y; float ri = uImg.x / uImg.y;
  vec2 s = rs < ri ? vec2(rs / ri, 1.0) : vec2(1.0, ri / rs);
  return (uv - 0.5) * s + 0.5;
}
void main(){
  vec2 uv = cover(vUv);
  uv = (uv - 0.5) / uZoom + 0.5 + uOffset + uPointer * 0.010;
  uv.y = 1.0 - uv.y;
  uv = clamp(uv, 0.001, 0.999);
  float asp = uImg.x / uImg.y;
  float m = texture2D(uMask, uv).r * uIntensity;
  float t = uTime;
  vec2 p = uv * vec2(asp, 1.0) * 7.0;
  // perspectiva: las ondas se comprimen hacia el fondo de la imagen
  p.y *= 1.0 + (1.0 - uv.y) * 1.6;
  float n1 = noise(p * 1.1 + vec2(t * 0.32, t * 0.18));
  float n2 = noise(p * 2.3 - vec2(t * 0.22, -t * 0.27));
  vec2 d = vec2(sin(p.y * 2.6 + t * 1.25 + n1 * 3.0), cos(p.x * 1.9 - t * 1.05 + n2 * 3.0)) * 0.55 + (vec2(n1, n2) - 0.5);
  // ondas concéntricas del toque / cursor
  vec2 q = (uv - uTap.xy) * vec2(asp, 1.0);
  float dist = length(q);
  float ring = sin(dist * 70.0 - uTap.z * 10.0) * exp(-uTap.z * 1.3) * exp(-dist * 5.0) * uTap.w;
  d += ring * 3.0 * normalize(q + 1e-4);
  vec2 wv = vec2(sin(uv.y * 38.0 - t * 5.0 + n1 * 4.0), cos(uv.x * 26.0 + t * 4.0 + n2 * 4.0)) * uWave * 0.018;
  vec2 uv2 = clamp(uv + d * 0.0042 * m + wv, 0.001, 0.999);
  vec3 col = texture2D(uTex, uv2).rgb;
  // luz: cáusticas + destellos especulares, solo dentro del agua
  float c = caustic(mod(p * 0.9, 6.2831) + 20.0, t * 0.55);
  float spark = pow(max(0.0, noise(p * 6.0 + vec2(t * 0.9, -t * 0.6)) - 0.62) * 2.6, 3.0);
  col += m * uCaustics * (c * 0.16 + clamp(spark, 0.0, 1.0) * 0.35) * vec3(0.88, 0.98, 1.0);
  col = min(col, vec3(1.0));
  col += m * ring * 0.08;
  gl_FragColor = vec4(col, 1.0);
}
`

export type WaterOptions = {
  image: string
  mask: string
  intensity?: number
  caustics?: number
  interactive?: boolean
}

export class WaterScene {
  private gl: WebGLRenderingContext
  private prog!: WebGLProgram
  private u: Record<string, WebGLUniformLocation | null> = {}
  private raf = 0
  private start = performance.now()
  private visible = true
  private imgSize: [number, number] = [1, 1]
  private ro?: ResizeObserver
  private io?: IntersectionObserver
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  private tap = { x: 0.5, y: 0.6, t: 99, w: 0 }
  private cleanup: (() => void)[] = []
  /** Valores animables desde GSAP */
  state = { zoom: 1.06, offsetX: 0, offsetY: 0, intensity: 1, caustics: 1, wave: 0 }
  ready: Promise<void>

  constructor(private canvas: HTMLCanvasElement, private opts: WaterOptions) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' })
    if (!gl) throw new Error('webgl-unavailable')
    this.gl = gl
    this.state.intensity = opts.intensity ?? 1
    this.state.caustics = opts.caustics ?? 1
    this.initProgram()
    this.ready = this.loadTextures()
    this.bind()
  }

  private initProgram() {
    const gl = this.gl
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src); gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader')
      return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link')
    gl.useProgram(p); this.prog = p
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(p, 'aPos')
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    for (const n of ['uTex', 'uMask', 'uRes', 'uImg', 'uPointer', 'uOffset', 'uTime', 'uZoom', 'uIntensity', 'uCaustics', 'uTap', 'uWave'])
      this.u[n] = gl.getUniformLocation(p, n)
  }

  private loadImage(src: string) {
    return new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image(); im.decoding = 'async'
      im.onload = () => res(im); im.onerror = rej; im.src = src
    })
  }

  private async loadTextures() {
    const [im, mk] = await Promise.all([this.loadImage(this.opts.image), this.loadImage(this.opts.mask)])
    const gl = this.gl
    this.imgSize = [im.naturalWidth, im.naturalHeight]
    const tex = (unit: number, source: HTMLImageElement) => {
      const t = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source)
    }
    tex(0, im); tex(1, mk)
    gl.uniform1i(this.u.uTex, 0); gl.uniform1i(this.u.uMask, 1)
    this.resize()
    this.loop()
  }

  private bind() {
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(this.canvas)
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (this.visible) this.loop() }, { rootMargin: '100px' })
    this.io.observe(this.canvas)
    const onVis = () => { if (!document.hidden) this.loop() }
    document.addEventListener('visibilitychange', onVis)
    this.cleanup.push(() => document.removeEventListener('visibilitychange', onVis))
    if (this.opts.interactive) {
      const target = this.canvas.parentElement ?? this.canvas
      const toUv = (e: PointerEvent) => {
        const r = this.canvas.getBoundingClientRect()
        return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
      }
      const move = (e: PointerEvent) => {
        const p = toUv(e)
        this.pointer.tx = (p.x - 0.5) * 2; this.pointer.ty = (p.y - 0.5) * 2
        if (e.pointerType === 'mouse' && this.tap.t > 1.6) this.splash(p.x, p.y, 0.35)
      }
      const down = (e: PointerEvent) => { const p = toUv(e); this.splash(p.x, p.y, 1) }
      target.addEventListener('pointermove', move, { passive: true })
      target.addEventListener('pointerdown', down, { passive: true })
      this.cleanup.push(() => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerdown', down) })
    }
  }

  /** Lanza una onda en coordenadas de pantalla (0..1). */
  splash(sx: number, sy: number, strength = 1) {
    // convertir de pantalla a uv de imagen (inverso de cover + zoom)
    const r = this.canvas.getBoundingClientRect()
    const rs = r.width / r.height, ri = this.imgSize[0] / this.imgSize[1]
    const s = rs < ri ? [rs / ri, 1] : [1, ri / rs]
    const ux = ((sx - 0.5) * s[0]) / this.state.zoom + 0.5 + this.state.offsetX
    const uy = ((0.5 - sy) * s[1]) / this.state.zoom + 0.5 + this.state.offsetY
    this.tap = { x: ux, y: 1 - uy, t: 0, w: strength }
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 1.75)
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h
      this.gl.viewport(0, 0, w, h)
    }
  }

  private last = performance.now()
  private loop = () => {
    cancelAnimationFrame(this.raf)
    if (!this.visible || document.hidden) return
    const now = performance.now()
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now
    this.tap.t += dt
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.05
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.05
    const gl = this.gl, u = this.u, s = this.state
    const t = ((now - this.start) / 1000) % 1000
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height)
    gl.uniform2f(u.uImg, this.imgSize[0], this.imgSize[1])
    gl.uniform2f(u.uPointer, this.pointer.x, -this.pointer.y)
    gl.uniform2f(u.uOffset, s.offsetX, s.offsetY)
    gl.uniform1f(u.uTime, t)
    gl.uniform1f(u.uZoom, s.zoom + Math.sin(t * 0.15) * 0.008)
    gl.uniform1f(u.uIntensity, s.intensity)
    gl.uniform1f(u.uCaustics, s.caustics)
    gl.uniform1f(u.uWave, s.wave)
    gl.uniform4f(u.uTap, this.tap.x, this.tap.y, this.tap.t, this.tap.w)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.ro?.disconnect(); this.io?.disconnect()
    this.cleanup.forEach((f) => f())
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
    void this.prog
  }
}

/** ¿Conviene activar WebGL? (fallback estático para movimiento reducido o equipos sin WebGL) */
export function canUseWater() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return false
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl')
  } catch { return false }
}
