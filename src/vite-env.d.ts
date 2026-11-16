/// <reference types="vite/client" />
declare module '*.mjs?url' { const u: string; export default u; }

declare const __BUILD__: string;
