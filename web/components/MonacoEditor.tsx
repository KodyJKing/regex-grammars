import React, { useRef, useState, useEffect, useMemo } from 'react'
import * as monaco from "monaco-editor"

export type EditorType = monaco.editor.IStandaloneCodeEditor

export function MonacoEditor( properties: {
    style?: React.CSSProperties,
    className?: string,
    options: monaco.editor.IStandaloneEditorConstructionOptions,
    onEditor?: ( editor: EditorType ) => void,
    onChanged?: ( value: string, editor: EditorType ) => void
} ) {
    const { options, onEditor, onChanged, ...rest } = properties

    const [ editor, setEditor ] = useState<EditorType | null>( null )
    const monacoEl = useRef( null )

    useEffect( () => {
        if ( monacoEl ) {
            setEditor( ( editor ) => {
                if ( editor )
                    return editor
                const _editor = monaco.editor.create( monacoEl.current!, options )
                if ( onChanged ) {
                    _editor.onDidChangeModelContent( () => onChanged( _editor.getValue(), _editor ) )
                    onChanged( _editor.getValue(), _editor )
                }
                if ( onEditor )
                    onEditor( _editor )
                return _editor
            } )
        }

        return () => editor?.dispose()
    }, [ monacoEl.current ] )

    return <div ref={monacoEl} {...rest} />
}