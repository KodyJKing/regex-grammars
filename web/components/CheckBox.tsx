import React from 'react';

export function CheckBox( props ) {
    const { label, value, setValue, ...rest } = props;
    return <div
        className="flex-row"
        style={{
            alignItems: "stretch",
            userSelect: "none"
        }}
        onClick={e => setValue( !value )}
        {...rest}
    >
        <label>{label}</label>
        <input type="checkbox" checked={value} onChange={e => setValue( e.currentTarget.checked )} />
    </div>;
}
