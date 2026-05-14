/// <reference types="vite/client" />

// qz-tray ships without TypeScript declarations — silence the implicit-any error
declare module 'qz-tray' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qz: any;
  export default qz;
}

// jsrsasign has @types/jsrsasign but the dynamic import may need this
declare module 'jsrsasign' {
  export function stob64(s: string): string;
  export function hextorstr(hex: string): string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const KEYUTIL: any;
  export const KJUR: {
    crypto: {
      Signature: new (opts: { alg: string }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        init(key: any): void;
        updateString(data: string): void;
        sign(): string;
      };
    };
  };
}
