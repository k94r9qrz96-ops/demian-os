const paths: Record<string, string> = {
  grill: 'M5 9h14a7 7 0 0 1-14 0Zm3 7-2 5m10-5 2 5M12 16v5M9 3c0 1.5 1 1.5 1 3M12 2c0 1.5 1 1.5 1 3M15 3c0 1.5 1 1.5 1 3',
  kitchen: 'M6 3v8a2 2 0 0 0 4 0V3M8 11v10M16 3c-2 0-3 3-3 6s1 3 3 3v9',
  bed: 'M3 18V7m0 6h18v5M3 13V11a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v2m9 0v-1a3 3 0 0 0-3-3h-6',
  air: 'M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8',
  tv: 'M3 6h18v11H3zM8 21h8M12 17v4',
  wifi: 'M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01',
  towel: 'M6 3h12v14H6zM6 13h12M9 21h6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  left: 'M19 12H5m6-6-6 6 6 6',
  close: 'M6 6l12 12M18 6 6 18',
  whatsapp: 'M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.2A8.5 8.5 0 1 1 20 11.5ZM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2Z',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
}

export function Icon({ name, size = 20 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
