
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";

export default function ProtectedRoute({
  children,
  permission,
}) {
  const {
    user,
    isAuthenticated,
    isAuthLoading,
  } = useAuth();

  const location = useLocation();

  // Wait for backend session validation.
  if (isAuthLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#F6F6FC] text-[#3E439C] dark:bg-gray-950 dark:text-white"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#3E439C]/20 border-t-[#3E439C]" />
          <p className="text-sm">Checking your session...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users to login.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Authentication-only route.
  if (!permission) {
    return children;
  }

  const permissions = user?.permissions;

  // Accept one permission or any of several alternatives.
  const requiredPermissions = Array.isArray(permission)
    ? permission
    : [permission];

  const hasPermission = requiredPermissions.some(
    (key) => permissions?.[key] === true
  );

  // Authenticated but lacking the required permission.
  if (!hasPermission) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
