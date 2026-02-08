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
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-slate-800" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400"
      />
    </div>
  )
}

export default TextAreaField
