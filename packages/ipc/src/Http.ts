import type { Http as IHttp } from "@cortex/platform"
import { fetch } from "@tauri-apps/plugin-http"

export class Http implements IHttp {

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, options);
  }

  async download(url: string): Promise<string> {
    const response = await this.fetch(url);
      if (!response.ok) {
          throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }
    return response.text();
  }
}
