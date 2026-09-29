function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 4,
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-[#0D1B2A]" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className="w-full rounded-xl border border-[#0D1B2A]/15 bg-[#FCFAF5] px-3.5 py-2.5 text-sm text-[#0D1B2A] placeholder:text-[#415A77]/50 shadow-xs transition-colors duration-200 outline-none focus:border-[#415A77] focus:bg-white focus:ring-1 focus:ring-[#415A77]/20"
      />
    </div>
  )
}

export default TextAreaField
