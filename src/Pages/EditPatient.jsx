import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import EditPatientForm from "../Components/Patients/EditPatient";
import AppFooter from "../Components/Layout/AppFooter";

export default function EditPatient() {
  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] dark:bg-[#11121F]">
      {/* Existing Sidebar */}
      <AppSidebar />

      {/* Main Content */}
      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        {/* Existing Top Navbar */}
        <TopNavbar
          title="Edit Patient"
          breadcrumb={[
            "Hospital Management",
            "Patients",
            "Edit Patient",
          ]}
        />

        {/* Edit Patient Content */}
        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <EditPatientForm />
          <AppFooter />
        </main>
      </div>
    </div>
  );
}
