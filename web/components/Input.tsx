import React from 'react'

export function Input( props ) {
    const { style, value, setValue, ...rest } = props
    return <input
        value={value}
        onChange={e => setValue( e.currentTarget.value )}
        style={{ flex: "1 1 auto", backgroundColor: "inherit", ...{ style } }}
        {...rest}
    />
}
