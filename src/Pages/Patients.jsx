import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import PatientsList from "../Components/Patients/PatientsList";
import AppFooter from "../Components/Layout/AppFooter";


export default function Patients() {
  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] text-slate-800 dark:bg-[#11121F] dark:text-slate-100">
      <AppSidebar />

      {/* Matches the responsive sidebar: 0px mobile, 72px tablet, 260px desktop. */}
      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="Patients"
          breadcrumb={["Hospital Management", "Patients"]}
        />

        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <PatientsList />
                      <AppFooter />
          
        </main>
      </div>
    </div>
  );
}
