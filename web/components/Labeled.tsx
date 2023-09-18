import React from 'react'

export function Labeled( props ) {
    const { label, children, ...rest } = props
    return <div
        className="flex-row"
        style={{
            alignItems: "stretch",
            userSelect: "none"
        }}
        {...rest}
    >
        <label>{label}</label>
        {children}
    </div>
}
