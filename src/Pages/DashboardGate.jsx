import Dashboard from "./Dashboard";
import PublicDashboard from "./PublicDashboard";
import { useAuth } from "../Context/AuthContext";

export default function DashboardGate() {
  const { user } = useAuth();

  const canViewDashboard =
    user?.permissions?.["dashboard.view"] === true;

  return canViewDashboard
    ? <Dashboard />
    : <PublicDashboard />;
}