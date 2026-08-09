/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_CITIZEN_URL?: string;
  readonly VITE_MAP_LAT?: string;
  readonly VITE_MAP_LNG?: string;
  readonly VITE_MAP_ZOOM?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
