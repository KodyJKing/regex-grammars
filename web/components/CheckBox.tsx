import React from 'react'
import { Labeled } from './Labeled.js';

export function CheckBox( props ) {
    const { value, setValue, ...rest } = props
    return <Labeled {...rest} onClick={e => setValue( !value )} >
        <input type="checkbox" checked={value} onChange={e => setValue( e.currentTarget.checked )} />
    </Labeled>
}

