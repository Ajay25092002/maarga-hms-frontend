import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import PatientRegistrationForm from "../Components/PatientRegistration/PatientRegistrationForm";

export default function PatientRegistration() {
  return (
    <div className="min-h-screen bg-[#F6F6FC] dark:bg-[#11121F]">
      <AppSidebar />

      <div className="min-h-screen min-w-0 lg:ml-[260px]">
        <TopNavbar
          title="Patient Registration"
          breadcrumb={[
            "Hospital Management",
            "Patients",
            "Registration",
          ]}
        />

        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <PatientRegistrationForm />
        </main>
      </div>
    </div>
  );
}