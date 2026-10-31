import { useNavigate } from "react-router-dom";
import { ReceiptText } from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import OPBillsList from "../Components/OPBilling/OPBillsList";
import { useTheme } from "../Context/ThemeContext";
import AppFooter from "../Components/Layout/AppFooter";

export default function OPBills() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const text = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  const handleCreateBill = () => {
    navigate("/op-billing/new");
  };

  const handleViewBill = (bill) => {
    if (!bill?.id) {
      console.error("Cannot open bill: bill ID is missing.", bill);
      return;
    }

    navigate(`/op-billing/${encodeURIComponent(bill.id)}`);
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] dark:bg-[#11121F]">
      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="OP Bills"
          breadcrumb={["Hospital Management", "Billing", "OP Bills"]}
        />

        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full ">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                <ReceiptText
                  size={20}
                  className="text-[#3E439C] dark:text-[#D6D4FF]"
                />
              </div>

              <div>
                <h1 className={`text-lg font-semibold ${text}`}>
                  Outpatient Bills
                </h1>

                <p className={`mt-1 text-[13px] ${muted}`}>
                  View and manage outpatient billing records
                </p>
              </div>
            </div>

            {/* OPBillsList owns the OP-only request, filters, KPIs and pagination. */}
            <OPBillsList
              onCreateBill={handleCreateBill}
              onViewBill={handleViewBill}
            />
          </div>
          <AppFooter />
        </main>
      </div>
    </div>
  );
}
