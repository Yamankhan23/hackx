import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Redirects to /admin/login if there's no admin session. Session expiry
 * mid-use is handled separately by the axios 401 interceptor in services/api.ts.
 */
export function useAdminGuard(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      navigate("/admin/login");
    }
  }, [navigate]);
}
