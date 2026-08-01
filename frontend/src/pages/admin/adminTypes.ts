export type AdminUser = {
  id: number;
  adminId: string;
  name: string;
  email: string;
  role: string;
};

export type PaginatedResponse<T> = {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
  };
};
