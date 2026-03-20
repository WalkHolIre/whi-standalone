// @ts-nocheck
"use client"

import React, { createContext, useContext, forwardRef } from "react"

// Minimal context: just passes value + onChange from Select down to SelectContent
const Ctx = createContext({ value: '', onChange: (v: string) => {}, placeholder: 'Select...' })

export function Select({ value, onValueChange, defaultValue, children }: any) {
  const current = value !== undefined ? value : (defaultValue || '')

  // Extract placeholder from children tree
  let placeholder = 'Select...'
  React.Children.forEach(children, (child) => {
    if (child?.props?.children) {
      React.Children.forEach(child.props.children, (gc: any) => {
        if (gc?.props?.placeholder) placeholder = gc.props.placeholder
      })
    }
  })

  return (
    <Ctx.Provider value={{ value: current, onChange: onValueChange, placeholder }}>
      {children}
    </Ctx.Provider>
  )
}

// SelectTrigger: renders nothing visible — the <select> is in SelectContent
export const SelectTrigger = forwardRef(({ children, className, ...props }: any, ref) => {
  return null
})
SelectTrigger.displayName = 'SelectTrigger'

// SelectValue: renders nothing — placeholder is extracted by Select
export const SelectValue = forwardRef(({ placeholder, ...props }: any, ref) => {
  return null
})
SelectValue.displayName = 'SelectValue'

// SelectContent: renders the actual native <select> with <option> children
export const SelectContent = forwardRef(({ children, className, ...props }: any, ref) => {
  const { value, onChange, placeholder } = useContext(Ctx)

  return (
    <select
      ref={ref as any}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        display: 'block',
        width: '100%',
        height: 36,
        borderRadius: 6,
        border: '1px solid #cbd5e1',
        backgroundColor: '#fff',
        color: value ? '#1e293b' : '#9ca3af',
        padding: '4px 32px 4px 12px',
        fontSize: 14,
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
      }}
    >
      <option value="" disabled>{placeholder}</option>
      {children}
    </select>
  )
})
SelectContent.displayName = 'SelectContent'

// SelectItem: renders a native <option> element directly
export const SelectItem = forwardRef(({ value, children, disabled, className, ...props }: any, ref) => {
  return (
    <option ref={ref as any} value={value} disabled={disabled}>
      {children}
    </option>
  )
})
SelectItem.displayName = 'SelectItem'

// Pass-through wrappers
export function SelectGroup({ children }: any) { return <>{children}</> }
SelectGroup.displayName = 'SelectGroup'

export const SelectLabel = forwardRef(({ children, ...props }: any, ref) => {
  return <optgroup label={typeof children === 'string' ? children : ''}>{null}</optgroup>
})
SelectLabel.displayName = 'SelectLabel'

export const SelectSeparator = forwardRef((props: any, ref) => null)
SelectSeparator.displayName = 'SelectSeparator'

export const SelectScrollUpButton = () => null
export const SelectScrollDownButton = () => null
