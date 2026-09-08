import api from "./api";

export type PublicProblemStatement = {
  id: number;
  problemStatementId: string;
  title: string;
  description: string;
  domainId: number;
  domainName: string;
};

export async function fetchPublishedProblemStatements(): Promise<PublicProblemStatement[]> {
  const response = await api.get<PublicProblemStatement[] | { data: PublicProblemStatement[] }>(
    "/problem-statements"
  );
  return Array.isArray(response.data) ? response.data : response.data.data;
}
