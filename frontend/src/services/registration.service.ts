import api from "./api";
import type {
  College,
  Domain,
  RegisterTeamPayload,
  RegisterTeamResponse,
} from "../types/registration";

export async function fetchDomains(): Promise<Domain[]> {
  const response = await api.get<Domain[] | { data: Domain[] }>("/domains");
  return Array.isArray(response.data)
    ? response.data
    : response.data.data;
}

export async function fetchColleges(): Promise<College[]> {
  const response = await api.get<College[] | { data: College[] }>("/colleges");
  return Array.isArray(response.data)
    ? response.data
    : response.data.data;
}

export async function registerTeam(payload: RegisterTeamPayload) {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: RegisterTeamResponse;
  }>("/teams/register", payload);

  return response.data;
}
