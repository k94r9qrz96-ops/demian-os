/**
 * Graba el showreel cuadro a cuadro (30 fps) con reloj simulado: cada cuadro avanza el tiempo
 * exactamente 1/30 s, así las animaciones GSAP y el shader de agua salen fluidos aunque la
 * captura sea lenta. Uso: (servidor estático en apartclub-web/ puerto 4180) node video/record.cjs <dirFrames>
 */
const { chromium, devices } = require('playwright')
const FPS = 30
const CAPS = [
  { at: 3.0, k: 'Escena 01 · Intro', t: 'Una entrada con identidad' },
  { at: 5.2, k: 'Escena 02 · Tocá el agua', t: 'La piscina real, en movimiento' },
  { at: 9.0, k: 'Escena 03 · Scroll', t: 'Una película continua' },
  { at: 15.6, k: 'Escena 04 · El complejo', t: 'Un lugar para bajar el ritmo' },
  { at: 19.4, k: 'Postales', t: 'Una galería que se desliza sola' },
  { at: 24.4, k: 'Escena 05 · Lofts', t: 'Entrar al loft en primera persona' },
  { at: 30.5, k: 'Escena 06 · Experiencias', t: 'Elegí cómo vivir San Pedro' },
  { at: 36.2, k: 'Escena 07 · Reflejo', t: 'Atravesar el agua hasta El Mirador' },
  { at: 42.2, k: 'Escena 08 · Gastronomía', t: 'La mesa también es el viaje' },
  { at: 45.6, k: 'Escena 10 · Reservas', t: 'Reserva directa, sin fricción' },
  { at: 49.2, k: 'Escena 12 · Cierre', t: 'Tu escapada, a un toque' },
]
const END = 51.3
const ease = (x) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2

;(async () => {
  const out = process.argv[2]
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const ctx = await b.newContext({ ...devices['iPhone 14 Pro'], viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 })
  await ctx.addInitScript(({ CAPS, END }) => { window.CAPS = CAPS; window.END = END }, { CAPS, END })
  await ctx.clock.install({ time: new Date('2026-11-22T17:00:00-03:00') })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('pageerror', e.message))
  console.error('goto')
  await page.goto('http://localhost:4180/video/showreel.html', { waitUntil: 'commit' })
  console.error('loaded')
  for (let i = 0; i < 100; i++) { if (await page.evaluate(() => !!window.reel && document.fonts.status === 'loaded').catch(() => false)) break; await page.waitForTimeout(100) }
  await page.waitForTimeout(1500)
  // congelar el tiempo: desde acá solo avanza con runFor (1/30 s por cuadro)
  await page.clock.pauseAt(new Date('2026-11-22T17:10:00-03:00'))
  console.error('ready')
  const total = Math.ceil((await page.evaluate(() => window.reel.duration())) * FPS)
  let frame = null, P = null, prevMs = 0
  const site = () => frame
  const inSite = (fn, arg) => site()?.evaluate(fn, arg).catch(() => {})
  const click = (sel, i = 0) => inSite(([s, i]) => document.querySelectorAll(s)[i]?.click(), [sel, i])
  const splash = (x, y) => inSite(([x, y]) => {
    const w = document.querySelector('.hero .water'); const r = w.getBoundingClientRect()
    w.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width * x, clientY: r.top + r.height * y, bubbles: true, pointerType: 'touch' }))
  }, [x, y])
  const fired = new Set()
  const once = (key, t, at, fn) => { if (t >= at && !fired.has(key)) { fired.add(key); return fn() } }

  for (let f = 0; f < total; f++) {
    const t = f / FPS
    const ms = Math.round((f * 1000) / FPS)
    const D = f < 2 ? console.error : () => {}
    D('f', f, 'run'); if (ms > prevMs) await page.clock.runFor(ms - prevMs); prevMs = ms
    D('seek'); await page.evaluate((t) => { window.reel.seek(t) }, t); D('seeked')

    await once('load', t, 2.2, async () => {
      await page.evaluate(() => { document.getElementById('site').src = '/dist/index.html' })
      for (let i = 0; i < 100 && !frame; i++) { await page.waitForTimeout(50); frame = page.frames().find((fr) => fr.url().includes('/dist/')) }
      for (let i = 0; i < 150; i++) { if (await frame?.evaluate(() => !!document.querySelector('.hero')).catch(() => false)) break; await page.waitForTimeout(100) }
      await page.clock.runFor(100)
      console.error('site frame', !!frame)
    })
    await once('measure', t, 4.6, async () => {
      P = await inSite(() => {
        const pos = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : 0 }
        const vh = innerHeight
        return { vh, pin1: pos('#experiencia') - vh, disc: pos('#experiencia'), post: pos('.post'), postLen: pos('#lofts') - pos('.post') - vh, lofts: pos('.lofts__stage'), xp: pos('.xp__grid'),
          mirror: pos('.mirror'), pin2: pos('#gastronomia') - pos('.mirror') - vh, carta: pos('.carta'), bk: pos('.bk__card'), fin: pos('.fin') }
      })
    })
    if (P) {
      const segs = [
        [9.0, 15.0, 0, P.pin1],
        [15.6, 19.0, P.pin1, P.disc + 480],
        [19.0, 19.8, P.disc + 480, P.post],
        [19.8, 24.0, P.post, P.post + P.postLen],
        [24.0, 25.2, P.post + P.postLen, P.lofts - 150],
        [30.0, 31.2, P.lofts - 150, P.xp - 70],
        [35.9, 36.6, P.xp - 70, P.mirror],
        [36.6, 42.0, P.mirror, P.mirror + P.pin2],
        [42.0, 43.2, P.mirror + P.pin2, P.carta - 90],
        [45.2, 46.3, P.carta - 90, P.bk - 90],
        [49.0, 50.6, P.bk - 90, P.fin + 120],
      ]
      let y = null
      for (const [a, bb, y0, y1] of segs) if (t >= a && t <= bb + 0.05) y = y0 + (y1 - y0) * ease((t - a) / (bb - a))
      if (y !== null) await inSite((y) => window.scrollTo(0, y), y)
    }
    await once('s1', t, 6.0, () => splash(0.5, 0.66))
    await once('s2', t, 7.1, () => splash(0.25, 0.72))
    await once('s3', t, 8.1, () => splash(0.75, 0.62))
    await once('l1', t, 25.9, () => click('[aria-label="Espacio siguiente"]'))
    await once('l2', t, 27.5, () => click('[aria-label="Espacio siguiente"]'))
    await once('l3', t, 29.0, () => click('.lofts__tabs button', 5))
    await once('x1', t, 31.9, () => click('.xp__item button', 2))
    await once('x2', t, 33.3, () => click('.xp__item button', 3))
    await once('x3', t, 34.7, () => click('.xp__item button', 5))
    await once('d1', t, 43.6, () => click('.carta__list button', 1))
    await once('d2', t, 44.5, () => click('.carta__list button', 2))
    await once('b1', t, 46.7, () => inSite(() => {
      const el = document.querySelector('#reservar input[type=date]')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '2026-12-18')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }))
    await once('b2', t, 47.5, () => click('[aria-label="Agregar menor"]'))
    await once('b3', t, 48.1, () => click('.chip input', 1))
    D('shot'); await page.screenshot({ path: `${out}/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 })
    if (f % 150 === 0) console.error('frame', f, '/', total)
  }
  await b.close()
  console.error('done', total)
})()
