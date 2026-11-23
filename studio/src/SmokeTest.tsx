import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
export const SmokeTest = ({title}: {readonly title: string}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 14}});
  return (
    <AbsoluteFill style={{background: '#0B0B12', justifyContent: 'center', alignItems: 'center'}}>
      <h1 style={{fontFamily: 'sans-serif', color: 'white', fontSize: 140, transform: `scale(${s})`, opacity: interpolate(frame, [0, 10], [0, 1])}}>{title}</h1>
    </AbsoluteFill>
  );
};
