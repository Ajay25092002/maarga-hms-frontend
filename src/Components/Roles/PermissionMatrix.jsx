import React from "react";

const GROUPS = [
  { title: "Dashboard", prefix: "dashboard." },
  { title: "Patients", prefix: "patients." },
  { title: "OP Billing", prefix: "bills.op." },
  { title: "IP Billing", prefix: "bills.ip." },
  { title: "Nurse", prefix: "nurse." },
  { title: "Payments & Receipts", prefix: "payments." },
  { title: "Payment Refunds", prefix: "refunds." },
  { title: "Reports", prefix: "reports." },
  { title: "Users", prefix: "users." },
  { title: "Roles", prefix: "roles." },
];

const actionLabels = {
  view: "View",
  create: "Create",
  edit: "Edit",
  add_services: "Add Services",
  all_service_groups: "Allow All IP Service Groups (Nurse)",
  delete: "Delete",
  manage: "Manage",
};

const humanize = (key) => {
  const action = key.split(".").pop();
  return (
    actionLabels[action] || action.charAt(0).toUpperCase() + action.slice(1)
  );
};

export default function PermissionMatrix({
  catalog,
  value,
  onChange,
  readOnly = false,
}) {
  const keys = (catalog || [])
    .map((item) => (typeof item === "string" ? item : item?.key))
    .filter(Boolean);

  const groups = GROUPS.map((group) => ({
    ...group,
    permissions: keys.filter((key) => key.startsWith(group.prefix)),
  })).filter((group) => group.permissions.length);

  const groupedKeys = new Set(groups.flatMap((group) => group.permissions));

  const otherKeys = keys.filter((key) => !groupedKeys.has(key));

  if (otherKeys.length) {
    groups.push({
      title: "Other Permissions",
      permissions: otherKeys,
    });
  }

  const toggleGroup = (items, checked) => {
    const next = { ...value };

    items.forEach((key) => {
      next[key] = checked;
    });

    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Module permissions
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Select the modules and actions this role can access.
          </p>
        </div>

        <span className="w-fit rounded-full bg-[#F1F0FF] px-3 py-1.5 text-xs font-bold text-[#3E439C]">
          {keys.filter((key) => Boolean(value[key])).length} of {keys.length}{" "}
          selected
        </span>
      </div>

      {!groups.length ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">
          The permission catalogue could not be loaded.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map((group) => {
            const selected = group.permissions.filter((key) =>
              Boolean(value[key]),
            ).length;

            return (
              <section
                key={group.title}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#F8F8FC] px-4 py-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      {group.title}
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {selected} of {group.permissions.length} selected
                    </p>
                  </div>

                  {!readOnly && (
                    <div className="flex shrink-0 gap-3">
                      <button
                        type="button"
                        className="text-xs font-bold text-[#3E439C] hover:underline"
                        onClick={() => toggleGroup(group.permissions, true)}
                      >
                        Select all
                      </button>

                      <button
                        type="button"
                        className="text-xs font-bold text-slate-500 hover:underline"
                        onClick={() => toggleGroup(group.permissions, false)}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <div className="px-4 py-1">
                  {group.permissions.map((key) => (
                    <label
                      key={key}
                      className={`flex min-h-11 items-center gap-3 border-b border-slate-100 last:border-0 ${
                        readOnly ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#3E439C] focus:ring-[#3E439C]"
                        checked={Boolean(value[key])}
                        disabled={readOnly}
                        onChange={(event) =>
                          onChange({
                            ...value,
                            [key]: event.target.checked,
                          })
                        }
                      />

                      <span className="text-sm font-medium text-slate-700">
                        {humanize(key)}
                      </span>

                      <code className="ml-auto break-all text-right text-[10px] text-slate-400">
                        {key}
                      </code>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
