import { useEffect, useState } from "react";
const API = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/$/, "");
export default function SponsorSelect({
  value,
  onChange,
  dark = false,
  required = true,
}) {
  const [sponsors, setSponsors] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/sponsors`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        const d = await r.json().catch(() => []);
        if (!r.ok) throw new Error(d?.detail || "Unable to load sponsors");
        return Array.isArray(d) ? d : d.items || [];
      })
      .then((rows) => {
        if (alive) setSponsors(rows);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  const options = sponsors.filter(
    (x) => x.is_active || String(x.id) === String(value),
  );
  return (
    <div>
      <label
        className={`mb-2 block text-[13px] font-medium ${dark ? "text-slate-300" : "text-slate-600"}`}
      >
        Sponsor {required ? "*" : ""}
      </label>
      <select
        required={required}
        value={value ?? ""}
        onChange={(e) => {
          const selectedId = e.target.value;
          const selectedSponsor = sponsors.find(
            (sponsor) => String(sponsor.id) === String(selectedId),
          );
          onChange(
            selectedId ? Number(selectedId) : "",
            selectedSponsor?.sponsor_name || "",
          );
        }}
        className={`h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-[#3E439C] ${dark ? "border-slate-700 bg-[#171827] text-slate-100" : "border-slate-200 bg-white text-slate-800"}`}
      >
        <option value="">Select sponsor</option>
        {options.map((x) => (
          <option key={x.id} value={x.id}>
            {x.sponsor_name}
            {!x.is_active ? " (Inactive - existing bill)" : ""}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
