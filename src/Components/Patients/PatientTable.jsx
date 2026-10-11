import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../ui/table";

const getPatientName = (patient) =>
  patient?.name?.trim() || "—";

const getPatientId = (patient) =>
  patient?.patient_id ?? "—";

const getPatientEmail = (patient) =>
  patient?.email || "—";

const getPatientMobile = (patient) =>
  patient?.mobile || "—";

const getPatientAge = (patient) => {
  const dateOfBirth = patient?.date_of_birth;

  if (!dateOfBirth) return "—";

  const dob = new Date(
    `${String(dateOfBirth).slice(0, 10)}T00:00:00`
  );

  const today = new Date();

  if (Number.isNaN(dob.getTime()) || dob > today) {
    return "—";
  }

  let age = today.getFullYear() - dob.getFullYear();

  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() &&
      today.getDate() < dob.getDate())
  ) {
    age--;
  }

  return age >= 0 ? `${age} yrs` : "—";
};

const getPatientGender = (patient) =>
  patient?.gender || "—";

const getRegistrationDate = (patient) => {
  const date = patient?.registered_at;

  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const PatientTable = ({
  patients = [],
  dark = false,
  onViewPatient,
  onEditPatient,
  loading = false,
  emptyMessage = "No patients found.",
}) => {
  const theme = {
    header: dark
      ? "border-slate-700 bg-slate-800/70 text-slate-300"
      : "border-slate-200 bg-slate-50/80 text-slate-600",

    row: dark
      ? "border-slate-800 hover:bg-slate-800/60"
      : "border-slate-100 hover:bg-[#F1F0FF]/50",

    primaryText: dark
      ? "text-slate-100"
      : "text-slate-900",

    secondaryText: dark
      ? "text-slate-400"
      : "text-slate-500",

    patientId: dark
      ? "text-[#B9B7FF]"
      : "text-[#3E439C]",

    mutedText: dark
      ? "text-slate-400"
      : "text-slate-500",

    button: dark
      ? "border-slate-700 text-slate-200 hover:border-[#7775D1] hover:bg-[#303253] hover:text-[#D6D4FF] focus-visible:ring-[#7775D1]/40"
      : "border-slate-200 text-slate-700 hover:border-[#3E439C]/30 hover:bg-[#F1F0FF] hover:text-[#3E439C] focus-visible:ring-[#3E439C]/30",
  };

  const actionButtonClass = [
    "inline-flex h-9 w-20 shrink-0",
    "cursor-pointer items-center justify-center",
    "rounded-md border bg-transparent",
    "text-sm font-medium",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    theme.button,
  ].join(" ");

  return (
    <div
      className={[
        "w-full overflow-hidden rounded-lg border",
        dark ? "border-slate-800" : "border-slate-200",
      ].join(" ")}
    >
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-[1000px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[18%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[17%]" />
            <col className="w-[21%]" />
          </colgroup>

          <TableHeader>
            <TableRow
              className={[
                "h-14 border-b hover:bg-transparent",
                theme.header,
              ].join(" ")}
            >
              <TableHead className="px-4 text-left text-[13px] font-semibold">
                Patient ID / UHID
              </TableHead>

              <TableHead className="px-4 text-left text-[13px] font-semibold">
                Patient Name
              </TableHead>

              <TableHead className="px-4 text-left text-[13px] font-semibold">
                Age / Gender
              </TableHead>

              <TableHead className="px-4 text-left text-[13px] font-semibold">
                Mobile Number
              </TableHead>

              <TableHead className="px-4 text-left text-[13px] font-semibold">
                Registration Date
              </TableHead>

              <TableHead className="px-4 text-right text-[13px] font-semibold">
                <div className="flex items-center justify-end gap-2">
                  <span>Actions</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow
                  key={`patient-skeleton-${index}`}
                  className={[
                    "h-[78px] border-b",
                    theme.row,
                  ].join(" ")}
                >
                  {Array.from({ length: 6 }).map(
                    (_, cellIndex) => (
                      <TableCell
                        key={`skeleton-cell-${cellIndex}`}
                        className="px-4 py-3"
                      >
                        <div
                          className={[
                            "h-3.5 animate-pulse rounded",
                            cellIndex === 1
                              ? "w-28"
                              : cellIndex === 5
                                ? "ml-auto w-24"
                                : "w-20",
                            dark
                              ? "bg-slate-700"
                              : "bg-slate-200",
                          ].join(" ")}
                        />
                      </TableCell>
                    )
                  )}
                </TableRow>
              ))
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-40 px-4 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p
                      className={[
                        "text-sm font-medium",
                        theme.primaryText,
                      ].join(" ")}
                    >
                      {emptyMessage}
                    </p>

                    <p
                      className={[
                        "text-xs",
                        theme.secondaryText,
                      ].join(" ")}
                    >
                      Patient records will appear here.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient, index) => {
                const patientName = getPatientName(patient);
                const patientId = getPatientId(patient);
                const email = getPatientEmail(patient);
                const mobile = getPatientMobile(patient);
                const age = getPatientAge(patient);
                const gender = getPatientGender(patient);
                const registrationDate =
                  getRegistrationDate(patient);

                return (
                  <TableRow
                    key={patient.id ?? patient.patient_id ?? index}
                    className={[
                      "h-[78px] border-b transition-colors duration-150",
                      "last:border-b-0",
                      theme.row,
                    ].join(" ")}
                  >
                    {/* Patient ID / UHID */}
                    <TableCell
                      className={[
                        "overflow-hidden px-4 py-3",
                        "text-sm font-medium",
                        theme.patientId,
                      ].join(" ")}
                    >
                      <span
                        className="block truncate"
                        title={String(patientId)}
                      >
                        {patientId}
                      </span>
                    </TableCell>

                    {/* Patient Name and Email */}
                    <TableCell className="overflow-hidden px-4 py-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span
                          className={[
                            "truncate text-sm font-semibold",
                            theme.primaryText,
                          ].join(" ")}
                          title={patientName}
                        >
                          {patientName}
                        </span>

                        <span
                          className={[
                            "truncate text-xs",
                            theme.secondaryText,
                          ].join(" ")}
                          title={email}
                        >
                          {email}
                        </span>
                      </div>
                    </TableCell>

                    {/* Age / Gender */}
                    <TableCell className="px-4 py-3">
                      <div
                        className={[
                          "flex items-center gap-2 whitespace-nowrap",
                          "text-sm",
                          theme.primaryText,
                        ].join(" ")}
                      >
                        <span>{age}</span>

                        <span
                          className={[
                            "text-xs",
                            theme.mutedText,
                          ].join(" ")}
                        >
                          /
                        </span>

                        <span>{gender}</span>
                      </div>
                    </TableCell>

                    {/* Mobile Number */}
                    <TableCell
                      className={[
                        "px-4 py-3 text-sm",
                        theme.primaryText,
                      ].join(" ")}
                    >
                      <span className="whitespace-nowrap">
                        {mobile}
                      </span>
                    </TableCell>

                    {/* Registration Date */}
                    <TableCell
                      className={[
                        "px-4 py-3 text-sm",
                        theme.mutedText,
                      ].join(" ")}
                    >
                      <span className="whitespace-nowrap">
                        {registrationDate}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onViewPatient?.(patient)
                          }
                          aria-label={`View ${patientName}`}
                          className={actionButtonClass}
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onEditPatient?.(patient)
                          }
                          aria-label={`Edit ${patientName}`}
                          className={actionButtonClass}
                        >
                          Edit
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PatientTable;