declare module 'heic2any' {
  interface Heic2AnyOpciones {
    blob: Blob;
    toType?: string;
    quality?: number;
    multiple?: boolean;
  }
  export default function heic2any(opciones: Heic2AnyOpciones): Promise<Blob | Blob[]>;
}
