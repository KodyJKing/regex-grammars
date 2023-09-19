import React from 'react'

export function Input(
    props: React.HTMLAttributes<HTMLInputElement> & {
        value: string, setValue: ( value: string ) => void,
        validate?: ( value: string ) => boolean,
        pattern?: RegExp
    }
) {
    const {
        value, setValue,
        validate = () => true,
        pattern, style, ...rest
    } = props

    function checkAndSetValue( elem: HTMLInputElement ) {
        const value = elem.value
        if ( ( !pattern || pattern.test( value ) ) && validate( value ) )
            setValue( value )
    }

    return <input
        pattern={pattern?.source}
        value={value}
        onChange={e => checkAndSetValue( e.currentTarget )}
        style={{ flex: "1 1 auto", backgroundColor: "inherit", ...{ style } }}
        {...rest}
    />
}
