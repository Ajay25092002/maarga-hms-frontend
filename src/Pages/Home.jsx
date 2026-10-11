
import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <AppSidebar />

      <div className="min-h-screen md:ml-[248px]">
        <TopNavbar
          title="Hospital Operations"
          breadcrumb={["Hospital Billing", "Workspace"]}
        />
      </div>
    </div>
  );
}
