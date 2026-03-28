/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full origin of the FastAPI server for static deploys (no trailing slash). Example: https://your-api.onrender.com */
  readonly VITE_API_BASE?: string;
}
