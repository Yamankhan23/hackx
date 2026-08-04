import api from "./api";
import type {
  College,
  Domain,
  RegisterTeamPayload,
  RegisterTeamResponse,
  ResumeApplicationResponse,
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

export async function sendResumeLink(email: string) {
  const response = await api.post<{
    success: boolean;
    message: string;
  }>("/teams/continue", { email });

  return response.data;
}

export async function resumeApplication(token: string) {
  const response = await api.get<{
    success: boolean;
    data: ResumeApplicationResponse;
  }>(`/teams/resume/${token}`);

  return response.data;
}

export async function updateTeam(
  teamId: string,
  payload: RegisterTeamPayload
) {
  const response = await api.put<{
    success: boolean;
    message: string;
    data: RegisterTeamResponse;
  }>(`/teams/${teamId}`, payload);

  return response.data;
}
