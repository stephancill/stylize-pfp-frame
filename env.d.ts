declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      APP_URL: string;
      NEYNAR_API_KEY: string;
      HUB_URL: string;
    }
  }
}

export {};
