
import { useCallback, useEffect, useState } from "react";
import {
  Pencil,
  Plus,
  Power,
  Search,
  X,
  Check,
} from "lucide-react";

const API = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/+$/, "");

export default function SponsorsTab() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch sponsors
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const r = await fetch(
        `${API}/api/sponsors${
          search ? `?search=${encodeURIComponent(search)}` : ""
        }`,
        { credentials: "include" }
      );

      const d = await r.json().catch(() => []);

      if (!r.ok) {
        throw new Error(d?.detail || "Unable to load sponsors");
      }

      setRows(Array.isArray(d) ? d : d.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  // Add / Update sponsor
  const save = async (e) => {
    e.preventDefault();

    if (!name.trim() || busy) return;

    setBusy(true);
    setError("");

    try {
      const r = await fetch(
        editing
          ? `${API}/api/sponsors/${editing.id}`
          : `${API}/api/sponsors`,
        {
          method: editing ? "PUT" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sponsor_name: name.trim(),
          }),
        }
      );

      const d = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(d?.detail || "Unable to save sponsor");
      }

      setName("");
      setEditing(null);

      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditing(null);
    setName("");
    setError("");
  };

  // Activate / Deactivate sponsor
  const toggle = async (row) => {
    setError("");

    try {
      const r = await fetch(
        `${API}/api/sponsors/${row.id}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: !row.is_active,
          }),
        }
      );

      const d = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(d?.detail || "Unable to update status");
      }

      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Sponsor Master
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage sponsors used in IP and OP bills.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sponsors"
            className="
              h-10 w-full rounded-lg
              border border-slate-200
              bg-white pl-9 pr-3
              text-sm text-slate-700
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-[#3E439C]
              focus:ring-2 focus:ring-[#3E439C]/10
            "
          />
        </div>
      </div>

      {/* Add / Edit Sponsor */}
      <form
        onSubmit={save}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter sponsor name"
          maxLength={255}
          required
          className="
            h-10 flex-1 rounded-lg
            border border-slate-200
            bg-white px-3
            text-sm text-slate-700
            outline-none
            transition
            placeholder:text-slate-400
            focus:border-[#3E439C]
            focus:ring-2 focus:ring-[#3E439C]/10
          "
        />

        <button
          type="submit"
          disabled={busy}
          className="
            inline-flex h-10 items-center justify-center
            gap-2 rounded-lg
            bg-[#3E439C] px-5
            text-sm font-medium text-white
            shadow-sm
            transition
            hover:bg-[#323780]
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {editing ? (
            <Check size={16} />
          ) : (
            <Plus size={16} />
          )}

          {busy
            ? "Saving..."
            : editing
              ? "Update Sponsor"
              : "Add Sponsor"}
        </button>

        {editing && (
          <button
            type="button"
            onClick={cancelEdit}
            title="Cancel editing"
            className="
              inline-flex h-10 items-center justify-center
              rounded-lg bg-slate-100 px-3
              text-slate-600
              transition
              hover:bg-slate-200
            "
          >
            <X size={17} />
          </button>
        )}
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Sponsor Table */}
      <div className="
        overflow-hidden rounded-xl
        bg-white
        shadow-sm
        ring-1 ring-slate-200/70
      ">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            <thead className="bg-slate-50/80">
              <tr className="text-left text-slate-600">
                <th className="px-5 py-3.5 font-semibold">
                  Sponsor
                </th>

                <th className="px-5 py-3.5 font-semibold">
                  Status
                </th>

                <th className="px-5 py-3.5 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {loading ? (
                <tr>
                  <td
                    colSpan="3"
                    className="px-5 py-10 text-center text-slate-400"
                  >
                    Loading sponsors...
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="
                      transition-colors
                      hover:bg-slate-50/70
                    "
                  >
                    {/* Sponsor Name */}
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {row.sponsor_name}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`
                          inline-flex items-center gap-1.5
                          text-sm font-medium
                          ${
                            row.is_active
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }
                        `}
                      >
                        <span
                          className={`
                            h-1.5 w-1.5 rounded-full
                            ${
                              row.is_active
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }
                          `}
                        />

                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">

                        {/* Edit */}
                        <button
                          type="button"
                          title="Edit sponsor"
                          onClick={() => {
                            setEditing(row);
                            setName(row.sponsor_name);
                            setError("");
                          }}
                          className="
                            inline-flex h-8 w-8 items-center
                            justify-center rounded-lg
                            bg-slate-50 text-slate-500
                            transition
                            hover:bg-[#F1F0FF]
                            hover:text-[#3E439C]
                          "
                        >
                          <Pencil size={15} />
                        </button>

                        {/* Activate / Deactivate */}
                        <button
                          type="button"
                          title={
                            row.is_active
                              ? "Deactivate sponsor"
                              : "Activate sponsor"
                          }
                          onClick={() => toggle(row)}
                          className={`
                            inline-flex h-8 w-8 items-center
                            justify-center rounded-lg
                            transition
                            ${
                              row.is_active
                                ? "bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                : "bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                            }
                          `}
                        >
                          <Power size={15} />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="3"
                    className="px-5 py-10 text-center text-slate-400"
                  >
                    No sponsors found.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
