import { useEffect, useState } from "react";
import {
  fetchPublishedProblemStatements,
  type PublicProblemStatement,
} from "../services/problem-statement.service";

export function useProblemStatements() {
  const [statements, setStatements] = useState<PublicProblemStatement[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchPublishedProblemStatements()
      .then((data) => {
        if (!cancelled) setStatements(data);
      })
      .catch(() => {
        if (!cancelled) setStatements([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { statements, loaded };
}
