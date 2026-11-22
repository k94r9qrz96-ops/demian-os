# Pieza original "Alpinas" — piano íntimo + pad, compuesta por código para este reel.
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
SR=48000; DUR=30.0; N=int(SR*DUR)
rng=np.random.default_rng(7)
L=np.zeros(N); R=np.zeros(N)
def mtof(m): return 440*2**((m-69)/12)
def piano(m, t0, vel=0.6, length=4.0, pan=0.0):
    f=mtof(m); n=int(SR*length); t=np.arange(n)/SR
    B=0.0004*(f/261)**0.5
    s=np.zeros(n)
    for k in range(1,12):
        fk=f*k*np.sqrt(1+B*k*k)
        if fk>16000: break
        amp=(1/k**1.15)*(1 if k<4 else 0.6)*(0.75+0.25*vel)**k
        dec=np.exp(-t*(0.7+0.45*k)*(f/440)**0.35)
        s+=amp*np.sin(2*np.pi*fk*t+rng.uniform(0,6.28))*dec
    # cuerpo + martillo suave
    hn=np.convolve(rng.standard_normal(n),np.ones(24)/24,"same"); s+=0.006*hn*np.exp(-t*120)
    att=np.minimum(1,t/0.007)
    rel=np.ones(n); rl=int(0.25*SR); rel[-rl:]=np.linspace(1,0,rl)**2
    s*=att*rel*vel
    i0=int(t0*SR)
    if i0>=N: return
    i1=min(N,i0+n); s=s[:i1-i0]
    gl=np.cos((pan+1)*np.pi/4); gr=np.sin((pan+1)*np.pi/4)
    L[i0:i1]+=s*gl; R[i0:i1]+=s*gr
def pad(notes,t0,t1,vol=0.05):
    i0=int(t0*SR); i1=min(N,int(t1*SR)); n=i1-i0; t=np.arange(n)/SR
    env=np.minimum(1,t/2.5)*np.minimum(1,(n/SR-t)/2.5)
    for m in notes:
        f=mtof(m)
        for d,p in [(-0.07,-0.6),(0.0,0),(0.08,0.6)]:
            ff=f*2**(d/12/10)
            w=np.sin(2*np.pi*ff*t)+0.3*np.sin(4*np.pi*ff*t)+0.12*np.sin(6*np.pi*ff*t)
            w*=env*vol*(1+0.15*np.sin(2*np.pi*0.2*t+p))
            L[i0:i1]+=w*np.cos((p+1)*np.pi/4); R[i0:i1]+=w*np.sin((p+1)*np.pi/4)
BPM=70; b=60/BPM
# Progresión en Re mayor: Dmaj9 | Bm7 | Gmaj7 | A6sus  (x2) -> G | A | D
prog=[ (50,[62,66,69,73,76]), (47,[62,66,69,71,74]), (43,[62,66,67,71,74]), (45,[61,64,66,69,73]),
       (50,[62,66,69,73,76]), (47,[62,66,69,71,74]), (43,[59,62,66,67,71]), (45,[61,64,69,71,73]),
       (50,[62,66,69,74,78]) ]
bar=4*b  # 3.43 s
melody={ # (bar, beat): midi  — línea simple y cantable
 (1,0):78,(1,2.5):76,(1,3):74,(2,0):76,(2,2):73,(3,0):74,(3,3):71,
 (4,0):78,(4,1.5):81,(4,2):78,(4,3):76,(5,0):78,(5,2):74,(6,0):79,(6,1.5):78,(6,2):76,(7,0):76,(7,2):73,(7,3):76,(8,0):78 }
for i,(bass,ch) in enumerate(prog):
    t0=i*bar
    if t0>=DUR-1: break
    intro = i==0
    piano(bass-12 if not intro else bass, t0, 0.42 if not intro else 0.3, 6, -0.2)
    if i>=1: piano(bass, t0+0.02, 0.3, 5, -0.1)
    # arpegio en corcheas, suave
    pattern=[0,2,1,3,2,4,3,2] if i>0 else [0,2,4,3]
    step = b/2 if i>0 else b
    for j,k in enumerate(pattern):
        tt=max(0.0,t0+j*step+rng.uniform(-0.008,0.008))
        piano(ch[k], tt, (0.26 if j%2 else 0.32)*(0.8 if intro else 1)*(1.12 if i in (5,6) else 1), 3.5, 0.35*np.sin(j))
    pad([bass, ch[0], ch[2]], t0, min(DUR, t0+bar+2.5), 0.018 if i<5 else 0.026)
for (bi,bt),m in melody.items():
    piano(m, bi*bar+bt*b, 0.40, 4.5, 0.1)
# acorde final sostenido
piano(38, 8*bar, 0.45, 8, -0.2); piano(57,8*bar+0.03,0.3,8,0.2)
x=np.stack([L,R])
# reverb de sala: IR de ruido decayente filtrado, estéreo
irn=int(2.8*SR); ti=np.arange(irn)/SR
sos=butter(2,[200,7000],'bandpass',fs=SR,output='sos')
irL=sosfilt(sos,rng.standard_normal(irn))*np.exp(-ti*2.4); irR=sosfilt(sos,rng.standard_normal(irn))*np.exp(-ti*2.4)
irL[:int(0.012*SR)]=0; irR[:int(0.017*SR)]=0
wetL=fftconvolve(x[0],irL)[:N]; wetR=fftconvolve(x[1],irR)[:N]
wet=np.stack([wetL,wetR]); wet/=np.abs(wet).max()+1e-9; dry=x/(np.abs(x).max()+1e-9)
y=0.72*dry+0.42*wet
y=sosfilt(butter(1,35,'highpass',fs=SR,output='sos'),y)
# fades
fi=int(0.8*SR); y[:,:fi]*=np.linspace(0,1,fi)**2
fo=int(2.2*SR); y[:,-fo:]*=np.linspace(1,0,fo)**1.5
y=np.tanh(y*1.1)/np.tanh(1.1); y*=0.89/np.abs(y).max()
import wave
w=wave.open('music/alpinas_theme.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((y.T*32767).astype(np.int16).tobytes()); w.close(); print('ok', y.shape[1]/SR)
