export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="h-17">
      <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue !== "—" ? defaultValue : ""}
        placeholder={placeholder}
        required={required}
        className="
          w-full px-3 py-2 text-sm rounded-lg bg-white border border-black/60
          text-black/60 placeholder-black/30 focus:border-blue-400
          focus:ring-4 focus:outline-none focus:ring-blue-400/30 w-48
          transition-all
        "
      />
    </div>
  );
}

export function SubmitBtn({ loading }: { loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="
        w-full py-2.5 rounded-lg text-sm font-medium
        bg-blue-500 hover:bg-blue-400 disabled:opacity-50
        text-white transition-colors mt-2
      "
    >
      {loading ? "Saving…" : "Save"}
    </button>
  );
}
