
import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { readCachedQuery, writeCachedQuery } from "@/lib/offline-store";

type QueryState<T> = {
  data: T | null;
  isLoading: boolean;
  isOfflineData: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useCachedAuthedQuery<T>(path: string): QueryState<T> {
  const { getToken } = useAuth();
  const [data, setData] = useState<T | null>(() => readCachedQuery<T>(path));
  const [isLoading, setIsLoading] = useState(data === null);
  const [isOfflineData, setIsOfflineData] = useState(data !== null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const nextData = await apiFetch<T>(path, { token });
      writeCachedQuery(path, nextData);
      setData(nextData);
      setIsOfflineData(false);
    } catch (queryError) {
      const cached = readCachedQuery<T>(path);
      if (cached) {
        setData(cached);
        setIsOfflineData(true);
      }
      setError(queryError instanceof Error ? queryError.message : "Request failed.");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, isOfflineData, error, refresh };
}
