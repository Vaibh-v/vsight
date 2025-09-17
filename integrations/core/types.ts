export type DateRange = { startDate: string; endDate: string };

export type RunContext = {
  accessToken?: string;   // OAuth token (NextAuth)
  apiKey?: string;        // For future key-based providers
  projectId?: string;     // Generic slot for account/property/site id
};

export type RunInput = {
  op: string;             // e.g. 'ga4.sessions.timeseries'
  params?: Record<string, any>;
  range?: DateRange;
};

export type RunResult<T = any> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export interface Integration {
  id: string;             // 'ga4', 'gsc', 'clarity', etc.
  label: string;          // 'Google Analytics 4'
  ops: string[];          // supported operations
  run(ctx: RunContext, input: RunInput): Promise<RunResult>;
}
