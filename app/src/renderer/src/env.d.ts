/// <reference types="vite/client" />
import type { IcamApi } from '../../preload'

declare global {
  interface Window {
    icam: IcamApi
  }
}
export {}
