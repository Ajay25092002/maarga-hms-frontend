import React from "react";

const actionClass = "text-xs font-semibold text-[#3E439C] hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded";
export default function RolesTable({ roles, loading, onView, onEdit, onDelete, onToggleStatus }) {
  if (loading) return <div className="p-12 text-center text-sm text-slate-500">Loading roles...</div>;
  if (!roles.length) return (
    <div className="p-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1F0FF] text-2xl text-[#3E439C]">◎</div>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">No roles found</h3>
      <p className="mt-1 text-sm text-slate-500">Create a role to define access to HMS modules.</p>
    </div>
  );

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[850px] border-collapse text-left">
        <thead className="bg-[#F8F8FC] text-[11px] uppercase tracking-wide text-slate-500">
          <tr>{["Role name", "Description", "Permissions", "Status", "Actions"].map((label) => <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">{label}</th>)}</tr>
        </thead>
        <tbody>
          {roles.map((role) => {
            const count = Object.values(role.permissions || {}).filter(Boolean).length;
            return <tr key={role.id} className="border-b border-slate-100 last:border-0 hover:bg-[#FAFAFF]">
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] text-sm font-bold text-[#3E439C]">{(role.name || "R").trim().charAt(0).toUpperCase()}</span>
                  <span className="font-semibold text-slate-800">{role.name}</span>
                </div>
              </td>
              <td className="max-w-[260px] px-4 py-4 text-sm text-slate-500">{role.description || "—"}</td>
              <td className="px-4 py-4"><span className="whitespace-nowrap rounded-full border border-indigo-100 bg-[#F8F7FF] px-2.5 py-1 text-xs font-semibold text-[#3E439C]">{count} permissions</span></td>
              <td className="px-4 py-4"><span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${role.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{role.is_active ? "Active" : "Inactive"}</span></td>
              <td className="px-4 py-4"><div className="flex items-center gap-3 whitespace-nowrap">
                <button type="button" className={actionClass} onClick={() => onView(role)}>View</button>
                <button type="button" className={actionClass} onClick={() => onEdit(role)}>Edit</button>
                <button type="button" className={actionClass} onClick={() => onToggleStatus(role)}>{role.is_active ? "Deactivate" : "Activate"}</button>
                <button type="button" className={`${actionClass} text-rose-600`} onClick={() => onDelete(role)}>Delete</button>
              </div></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
