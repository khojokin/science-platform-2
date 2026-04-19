import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type QueryState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useAuthedQuery<T>(path: string): QueryState<T> {
  const { getToken } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const nextData = await apiFetch<T>(path, { token });
      setData(nextData);
    } catch (queryError) {
      setError(queryError instanceof Error ? queryError.message : "Request failed.");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
