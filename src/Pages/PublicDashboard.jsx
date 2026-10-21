import React from "react";
import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import logo from "../assets/logo.png";

export default function PublicDashboard() {
  return (
    <div className="flex h-screen min-h-0 min-w-0 overflow-hidden bg-[#F6F6FC] text-[#20213A]">
      <AppSidebar />

      {/* Main content area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:ml-[260px]">
        <TopNavbar title="Hospital Operations" />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#F6F6FC]">
          <div className="mx-auto flex h-full w-full max-w-[1500px] min-h-0 flex-col px-5 py-5 sm:px-8 sm:py-6 lg:px-10 xl:px-12">


            {/* Simple welcome layout without an outer card */}
            <section className="grid min-h-0 flex-1 items-center gap-5 py-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
              <div className="min-w-0">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#3E439C]">
                  Hospital Billing &amp; Operations
                </p>

                <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-[-0.035em] text-[#191D55] sm:text-4xl xl:text-5xl">
                  Welcome to
                  <span className="mt-1 block">Maarga Mindcare Hospital</span>
                </h1>

                <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                  A centralized workspace for hospital billing and daily
                  operations, designed to support accurate and efficient
                  workflows.
                </p>

                <div className="mt-7 flex max-w-xl items-start gap-3 border-l-2 border-[#3E439C] py-1 pl-4">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] text-[#3E439C]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 3 4.5 6v5.5c0 4.6 3.2 7.8 7.5 9.5 4.3-1.7 7.5-4.9 7.5-9.5V6L12 3Z"
                        strokeLinejoin="round"
                      />
                      <path
                        d="m9 12 2 2 4-4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#25295F] sm:text-base">
                      Your hospital operations workspace
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Use the navigation menu to access the modules available
                      to your account.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lightweight hospital illustration */}
              <div className="relative mx-auto flex w-full min-w-0 max-w-[400px] items-center justify-center lg:max-w-none">
                <div className="absolute aspect-square w-[78%] max-w-[310px] rounded-full bg-[#F1F0FF]" />
                <svg
                  viewBox="0 0 500 400"
                  className="relative z-10 max-h-[min(42vh,330px)] w-full max-w-[420px]"
                  fill="none"
                  role="img"
                  aria-label="Hospital building illustration"
                >
                  <path
                    d="M90 195 180 158 275 191V310H90V195Z"
                    fill="#EAE9FF"
                    stroke="#B9B7F5"
                    strokeWidth="2"
                  />
                  <path
                    d="M90 195 180 158 275 191"
                    stroke="#AAA8F0"
                    strokeWidth="3"
                  />
                  {[
                    [110, 210], [151, 194], [192, 208],
                    [110, 247], [151, 231], [192, 246],
                  ].map(([x, y], i) => (
                    <rect
                      key={`wing-${i}`}
                      x={x}
                      y={y}
                      width="25"
                      height="21"
                      rx="2"
                      fill="#D4E8FC"
                      stroke="#B5C6F1"
                    />
                  ))}

                  <path
                    d="M205 143 303 101 411 143V310H205V143Z"
                    fill="#FFFFFF"
                    stroke="#A9A7EF"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M205 143 303 101 411 143"
                    stroke="#9694E8"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  <path d="M303 101V310" stroke="#C9C8F7" strokeWidth="2" />

                  {[
                    [226, 165], [269, 165], [326, 165], [368, 165],
                    [226, 207], [269, 207], [326, 207], [368, 207],
                  ].map(([x, y], i) => (
                    <rect
                      key={`window-${i}`}
                      x={x}
                      y={y}
                      width="28"
                      height="25"
                      rx="2"
                      fill="#D8ECFC"
                      stroke="#B5C6F1"
                    />
                  ))}

                  <rect x="281" y="117" width="44" height="44" rx="8" fill="#F1F0FF" />
                  <path
                    d="M298 124H308V134H318V144H308V154H298V144H288V134H298V124Z"
                    fill="#3E439C"
                  />
                  <rect
                    x="282"
                    y="254"
                    width="42"
                    height="56"
                    rx="3"
                    fill="#D6E8FC"
                    stroke="#A9B8F0"
                    strokeWidth="2"
                  />
                  <path d="M303 254V310" stroke="#A9B8F0" strokeWidth="2" />
                  <circle cx="296" cy="284" r="2" fill="#5559C2" />
                  <circle cx="310" cy="284" r="2" fill="#5559C2" />

                  <path
                    d="M48 321H455"
                    stroke="#D6D5F7"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path d="M94 322 124 301 149 322" fill="#DCE9D5" />
                  <path d="M352 322 379 297 410 322" fill="#DCE9D5" />

                  <path d="M67 321V264" stroke="#9A9DE0" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="67" cy="256" r="17" fill="#D9D8FF" />
                  <circle cx="54" cy="268" r="12" fill="#E7E6FF" />
                  <circle cx="80" cy="270" r="12" fill="#CFDDF8" />

                  <path d="M438 321V261" stroke="#9A9DE0" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="438" cy="251" r="19" fill="#D9D8FF" />
                  <circle cx="423" cy="265" r="12" fill="#E7E6FF" />
                  <circle cx="452" cy="267" r="12" fill="#CFDDF8" />
                  <ellipse cx="290" cy="329" rx="180" ry="9" fill="#E4E3FA" />
                </svg>
              </div>
            </section>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#E3E1FF] pt-3 text-[10px] text-slate-500 sm:text-xs">
              <span>Maarga Mindcare Hospital</span>
              <span className="text-right">
                Need dashboard access? Contact your system administrator.
              </span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
