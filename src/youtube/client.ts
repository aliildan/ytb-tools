import { Innertube } from "youtubei.js";

let instance: Promise<Innertube> | null = null;

export function getInnertube(): Promise<Innertube> {
  if (!instance) {
    instance = Innertube.create();
  }
  return instance;
}
