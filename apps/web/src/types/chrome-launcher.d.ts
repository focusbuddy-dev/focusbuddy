declare module 'chrome-launcher' {
  export type LaunchedChrome = {
    kill(): Promise<void>;
    port: number;
  };

  export function launch(options: {
    chromeFlags?: string[];
    chromePath?: string;
  }): Promise<LaunchedChrome>;
}