import { useState } from "react";
import {
  Tags,
  Layers3,
  Stethoscope,
  BedDouble,
  IndianRupee,
  FileSpreadsheet,
} from "lucide-react";
import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import AppFooter from "../Components/Layout/AppFooter";
import { useTheme } from "../Context/ThemeContext";

import ServiceGroupsTab from "../Components/Pricing/ServiceGroupsTab";
import ServicesTab from "../Components/Pricing/ServicesTab";
import DoctorsTab from "../Components/Pricing/DoctorsTab";
import RoomTypesTab from "../Components/Pricing/RoomTypesTab";
import ServicePricingTab from "../Components/Pricing/ServicePricingTab";
import PricingImportTab from "../Components/Pricing/PricingImportTab";

const pricingTabs = [
  {
    id: "service-groups",
    label: "Service Groups",
    icon: Layers3,
    component: ServiceGroupsTab,
  },
  {
    id: "services",
    label: "Services",
    icon: Tags,
    component: ServicesTab,
  },
  {
    id: "doctors",
    label: "Doctors",
    icon: Stethoscope,
    component: DoctorsTab,
  },
  {
    id: "room-types",
    label: "Room Types",
    icon: BedDouble,
    component: RoomTypesTab,
  },
  {
    id: "service-pricing",
    label: "Service Pricing",
    icon: IndianRupee,
    component: ServicePricingTab,
  },
  {
    id: "import",
    label: "Import",
    icon: FileSpreadsheet,
    component: PricingImportTab,
  },
];

export default function PricingManagement() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState("service-groups");

  const ActiveComponent =
    pricingTabs.find((tab) => tab.id === activeTab)?.component ??
    ServiceGroupsTab;

  const styles = {
    page: isDark ? "bg-gray-950 text-gray-100" : "bg-[#F6F6FC] text-gray-800",
    card: isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white",
    heading: isDark ? "text-gray-100" : "text-gray-800",
    description: isDark ? "text-gray-400" : "text-gray-500",
    tabBar: isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white",
    inactiveTab: isDark
      ? "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
  };

  return (
    <div data-theme={theme} className="min-h-screen">
      <AppSidebar />

      <div className="min-h-screen md:ml-[248px]">
        <TopNavbar
          title="Pricing Management"
          breadcrumb={["Settings", "Pricing Management"]}
        />

        <main
          className={`min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-2 ${
            isDark ? "bg-gray-950 text-gray-100" : "bg-[#F6F6FC] text-gray-800"
          }`}
        >
          {/* Keep your existing Pricing Management heading and six-tab content here */}

          <div
            data-theme={theme}
            className={`min-h-full space-y-5 p-4 sm:p-6 lg:p-7 ${styles.page}`}
          >
            {/* Page heading */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F1F0FF] text-[#3E439C]">
                    <IndianRupee size={23} />
                  </div>

                  <div>
                    <h1
                      className={`text-xl font-semibold sm:text-2xl ${styles.heading}`}
                    >
                      Pricing Management
                    </h1>
                    <p className={`mt-1 text-sm ${styles.description}`}>
                      Manage service masters and OP/IP billing rates.
                    </p>
                  </div>
                </div>
              </div>

              
            </div>

            {/* Pricing tabs */}
            <div className={`overflow-hidden rounded-xl border ${styles.card}`}>
              <div
                role="tablist"
                aria-label="Pricing management sections"
                className={`flex gap-1 overflow-x-auto border-b p-2 ${styles.tabBar}`}
              >
                {pricingTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      id={`pricing-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls="pricing-tab-panel"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
                        isActive
                          ? "bg-[#F1F0FF] text-[#3E439C] shadow-sm"
                          : styles.inactiveTab
                      }`}
                    >
                      <Icon size={16} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected tab content */}
              <div
                id="pricing-tab-panel"
                role="tabpanel"
                aria-labelledby={`pricing-tab-${activeTab}`}
                className="min-w-0 p-4 sm:p-5 lg:p-6"
              >
                <ActiveComponent />
              </div>
            </div>
          </div>
          <AppFooter />
        </main>
      </div>
    </div>
  );
}
