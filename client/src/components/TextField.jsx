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
    <div className={`grid gap-2 ${className}`.trim()}>
      <label className="text-sm font-semibold text-slate-800" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 ${inputClassName}`.trim()}
      />
    </div>
  )
}

export default TextField
