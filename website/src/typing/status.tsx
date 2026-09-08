import { type ReactNode, createContext, useContext, useMemo, useState } from "react";

export interface TypingStatus {
  /** Which test on the page is currently being typed. */
  source: "hero" | "playground" | null;
  speed: number;
  accuracy: number;
  progress: string;
  finished: boolean;
  /** False when the run was too fast to have been typed; the figures are noise. */
  credible: boolean;
}

const EMPTY: TypingStatus = {
  source: null,
  speed: 0,
  accuracy: 100,
  progress: "",
  finished: false,
  credible: true,
};

const StatusContext = createContext<{
  status: TypingStatus;
  report: (status: TypingStatus) => void;
}>({ status: EMPTY, report: () => {} });

/**
 * The page has two typing surfaces and one status bar at the bottom of the
 * window. Whichever surface is being typed owns the readout, exactly like the
 * extension's own status bar entry.
 */
export function StatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<TypingStatus>(EMPTY);
  const value = useMemo(() => ({ status, report: setStatus }), [status]);

  return <StatusContext.Provider value={value}>{children}</StatusContext.Provider>;
}

export function useTypingStatus(): TypingStatus {
  return useContext(StatusContext).status;
}

export function useReportStatus(): (status: TypingStatus) => void {
  return useContext(StatusContext).report;
}
