// Contrato de datos del reel. Un reel = una marca (brand.json del cliente) + un guion (reels/<id>.json).
// Todas las rutas de archivos son relativas a la carpeta del cliente (clients/<slug>/), que es el
// único directorio público que ve el render: un cliente nunca puede leer archivos de otro.

export type Brand = {
  slug: string;
  nombre: string;
  colores: {fondo: string; primario: string; acento: string; texto: string};
  tipografia: {titulos: string; cuerpo?: string}; // rutas relativas, p. ej. "marca/fuentes/Poppins-Bold.ttf"
  logo?: string | null;
  handle?: string | null;
};

export type Caption = {texto: string; desde: number; hasta: number}; // segundos desde el inicio del reel

export type Scene =
  | {tipo: 'hook'; duracion: number; lineas: string[]; resaltar?: string; kicker?: string}
  | {tipo: 'media'; duracion: number; src: string; video?: boolean; titulo?: string; texto?: string; movimiento?: 'zoomin' | 'zoomout' | 'panizq' | 'pander'}
  | {tipo: 'contraste'; duracion: number; antes: string; despues: string; etiquetaAntes?: string; etiquetaDespues?: string}
  | {tipo: 'lista'; duracion: number; titulo: string; items: string[]}
  | {tipo: 'proceso'; duracion: number; titulo?: string; pasos: string[]}
  | {tipo: 'frase'; duracion: number; texto: string; resaltar?: string}
  | {tipo: 'cta'; duracion: number; titulo: string; boton: string; sub?: string};

export type ReelProps = {
  brand: Brand;
  escenas: Scene[];
  transicion?: number; // frames de cada transición
  subtitulos?: Caption[];
  musica?: {src: string; volumen?: number; licencia: string} | null;
  marcaDeAgua?: string | null; // p. ej. "BORRADOR — no publicar"
};
