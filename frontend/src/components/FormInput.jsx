import React from 'react'

export function FormInput({ label, id, type = 'text', placeholder, value, onChange, required }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}{required && <span style={{ color: 'var(--terracotta)', marginLeft: 2 }}>*</span>}
      </label>
      <input
        id={id}
        type={type}
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  )
}

export function FormSelect({ label, id, options, value, onChange, required }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}{required && <span style={{ color: 'var(--terracotta)', marginLeft: 2 }}>*</span>}
      </label>
      <select
        id={id}
        className="form-select"
        value={value}
        onChange={onChange}
        required={required}
      >
        <option value="">— Select —</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}
