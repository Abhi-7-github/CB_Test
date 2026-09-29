function TextField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  className = '',
  inputClassName = '',
}) {
  return (
    <div className={`grid gap-1.5 ${className}`.trim()}>
      <label className="text-xs font-semibold uppercase tracking-wider text-[#0D1B2A]" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-xl border border-[#0D1B2A]/15 bg-[#FCFAF5] px-3.5 py-2.5 text-sm text-[#0D1B2A] placeholder:text-[#415A77]/50 shadow-xs transition-colors duration-200 outline-none focus:border-[#415A77] focus:bg-white focus:ring-1 focus:ring-[#415A77]/20 ${inputClassName}`.trim()}
      />
    </div>
  )
}

export default TextField
