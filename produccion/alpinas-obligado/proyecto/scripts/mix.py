import numpy as np,wave,subprocess
SR=48000;N=SR*30
def rd(p,ch=2):
    raw=subprocess.run(['ffmpeg','-v','error','-i',p,'-ac',str(ch),'-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout
    return np.frombuffer(raw,np.float32).reshape(-1,ch).T.copy()
def env(points):  # lista (t,gain_db), interpolación coseno
    t=np.arange(N)/SR; g=np.zeros(N); pts=sorted(points)
    for (t0,g0),(t1,g1) in zip(pts,pts[1:]):
        m=(t>=t0)&(t<t1); x=(t[m]-t0)/(t1-t0); g[m]=g0+(g1-g0)*(1-np.cos(np.pi*x))/2
    g[t>=pts[-1][0]]=pts[-1][1]; g[t<pts[0][0]]=pts[0][1]; return 10**(g/20)
def place(sig,t0):
    out=np.zeros((2,N)); i=int(t0*SR); n=min(sig.shape[1],N-i); out[:,i:i+n]=sig[:,:n]; return out
mus=rd('../music/alpinas_theme.wav')[:,:N]
vo=sum(place(rd(f,1).repeat(2,0),t) for f,t in [('voA.wav',3.55),('voB.wav',6.30),('voC.wav',12.10),('voD.wav',14.25)])
amb=rd('amb30.wav')[:,:N]
D=-9.5
menv=env([(0,-4),(3.2,-4),(3.55,D-4),(10.05,D-4),(10.6,-4),(11.8,-4),(12.1,D-4),(17.8,D-4),(18.4,-2.5),(24,-3),(30,-3)])
aenv=env([(0,6),(3.3,6),(3.9,1),(16.9,1),(17.6,5),(24,5),(30,4)])
mix=mus*menv+vo+amb*aenv*10**(8/20)
mix=mix[:, :N]; print('vo peak',np.abs(vo).max()); mix*=0.6/np.abs(mix).max()
w=wave.open('premix.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR)
w.writeframes((np.clip(mix.T,-1,1)*32767).astype(np.int16).tobytes());w.close()
print('peak',np.abs(mix).max())
