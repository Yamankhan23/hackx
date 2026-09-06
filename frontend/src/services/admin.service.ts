import api from "./api";
export { getApiErrorMessage, getBlobApiErrorMessage } from "../lib/apiError";

export type AdminLoginResponse = {
  admin: { id: number; adminId: string; name: string; email: string; role: string };
  token: string;
};

export type Domain = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

export type DomainInput = {
  name: string;
  description?: string;
  isActive?: boolean;
};

export type College = {
  id: number;
  collegeId: string;
  name: string;
  university: string | null;
  region: string;
  isActive: boolean;
};

export type CollegeInput = {
  collegeId: string;
  name: string;
  university?: string;
  region: string;
  isActive?: boolean;
};

export type Round = {
  id: number;
  roundId: string;
  name: string;
  roundNumber: number;
  type: "ONLINE" | "OFFLINE";
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
};

export type RoundInput = {
  roundId: string;
  name: string;
  roundNumber: number;
  type: "ONLINE" | "OFFLINE";
  description?: string;
  startAt?: string;
  endAt?: string;
  status?: "UPCOMING" | "ACTIVE" | "COMPLETED";
};

export type ProblemStatement = {
  id: number;
  problemStatementId: string;
  title: string;
  description: string;
  isPublished: boolean;
  domainName: string | null;
};

export type ProblemStatementInput = {
  problemStatementId: string;
  title: string;
  description: string;
  domainId?: number;
  isPublished?: boolean;
};

export type TeamStatus = "DRAFT" | "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED";

export type PaymentStatus = "CREATED" | "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export type Payment = {
  id: number;
  paymentId: string;
  teamId: string;
  teamName: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  failureReason: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type SelectRound2Result = {
  selected: { teamId: string; teamName: string }[];
  skipped: { teamId: number | string; teamName?: string; reason: string }[];
  failed: { teamId: string; teamName: string; reason: string }[];
};

export type ListMeta = { page: number; limit: number; total: number };
export type ListResult<T> = { data: T[]; meta: ListMeta };

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}

async function unwrapList<T>(
  promise: Promise<{ data: { data: T[]; meta?: Partial<ListMeta> } }>
): Promise<ListResult<T>> {
  const response = await promise;
  const { data, meta } = response.data;
  return {
    data,
    meta: { page: meta?.page ?? 1, limit: meta?.limit ?? data.length, total: meta?.total ?? data.length },
  };
}

async function exportAsExcel(
  url: string,
  params: Record<string, string | number> | undefined,
  fallbackFilename: string
): Promise<{ blob: Blob; filename: string }> {
  const response = await api.get(url, { params, responseType: "blob" });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? fallbackFilename;
  return { blob: response.data as Blob, filename };
}

export const adminService = {
  login: (email: string, password: string) =>
    unwrap<AdminLoginResponse>(api.post("/admin/login", { email, password })),

  getDashboard: () => unwrap<Record<string, unknown>>(api.get("/admin/dashboard")),

  getTeams: (params?: Record<string, string | number>) =>
    unwrapList<Record<string, unknown>>(api.get("/admin/teams", { params })),
  updateTeamStatus: (id: number, status: TeamStatus) =>
    unwrap<Record<string, unknown>>(api.patch(`/admin/teams/${id}/status`, { status })),
  exportTeams: (params?: Record<string, string | number>) =>
    exportAsExcel("/admin/teams/export", params, "teams-report.xlsx"),
  selectTeamsForRound2: (teamIds: number[]) =>
    unwrap<SelectRound2Result>(api.post("/admin/teams/select-round2", { teamIds })),

  getParticipants: (params?: Record<string, string | number>) =>
    unwrapList<Record<string, unknown>>(api.get("/admin/participants", { params })),
  exportParticipants: (params?: Record<string, string | number>) =>
    exportAsExcel("/admin/participants/export", params, "participants-report.xlsx"),

  getPayments: (params?: Record<string, string | number>) =>
    unwrapList<Payment>(api.get("/admin/payments", { params })),
  getPaymentById: (id: number) => unwrap<Payment>(api.get(`/admin/payments/${id}`)),

  getDomains: () => unwrap<Domain[]>(api.get("/admin/domains")),
  createDomain: (input: DomainInput) => unwrap<Domain>(api.post("/admin/domains", input)),
  updateDomain: (id: number, input: Partial<DomainInput>) =>
    unwrap<Domain>(api.put(`/admin/domains/${id}`, input)),
  toggleDomainStatus: (id: number, isActive: boolean) =>
    unwrap<Domain>(api.patch(`/admin/domains/${id}/status`, { isActive })),

  getColleges: () => unwrap<College[]>(api.get("/admin/colleges")),
  createCollege: (input: CollegeInput) => unwrap<College>(api.post("/admin/colleges", input)),
  updateCollege: (id: number, input: Partial<CollegeInput>) =>
    unwrap<College>(api.put(`/admin/colleges/${id}`, input)),
  toggleCollegeStatus: (id: number, isActive: boolean) =>
    unwrap<College>(api.patch(`/admin/colleges/${id}/status`, { isActive })),

  getRounds: () => unwrap<Round[]>(api.get("/admin/rounds")),
  createRound: (input: RoundInput) => unwrap<Round>(api.post("/admin/rounds", input)),
  updateRound: (id: number, input: Partial<RoundInput>) =>
    unwrap<Round>(api.put(`/admin/rounds/${id}`, input)),
  toggleRoundStatus: (id: number, status: Round["status"]) =>
    unwrap<Round>(api.patch(`/admin/rounds/${id}/status`, { status })),

  getProblemStatements: () =>
    unwrap<ProblemStatement[]>(api.get("/admin/problem-statements")),
  createProblemStatement: (input: ProblemStatementInput) =>
    unwrap<ProblemStatement>(api.post("/admin/problem-statements", input)),
  updateProblemStatement: (id: number, input: Partial<ProblemStatementInput>) =>
    unwrap<ProblemStatement>(api.put(`/admin/problem-statements/${id}`, input)),
  publishProblemStatement: (id: number, isPublished: boolean) =>
    unwrap<ProblemStatement>(
      api.patch(`/admin/problem-statements/${id}/publish`, { isPublished })
    ),
};
