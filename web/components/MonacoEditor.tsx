import React, { useRef, useState, useEffect, useMemo } from 'react'
import * as monaco from "monaco-editor"

export type EditorType = monaco.editor.IStandaloneCodeEditor

export function useMonacoEditorState() {
    const [ editor, setEditor ] = useState<EditorType | null>( null )
    const [ value, _setValue ] = useState( "" )

    function setValue( value: string ) {
        _setValue( value )
        editor?.setValue( value )
    }

    return { editor, setEditor, value, setValue }
}
type MonacoEditorState = ReturnType<typeof useMonacoEditorState>

export function MonacoEditor( properties: {
    style?: React.CSSProperties,
    className?: string,
    options: monaco.editor.IStandaloneEditorConstructionOptions,
    editorState?: MonacoEditorState,
} ) {
    const { options, editorState, ...rest } = properties

    const [ editor, setEditor ] = useState<EditorType | null>( null )
    const monacoEl = useRef( null )

    useEffect( () => {
        if ( monacoEl ) {
            setEditor( ( editor ) => {
                if ( editor )
                    return editor
                const _editor = monaco.editor.create( monacoEl.current!, options )
                if ( editorState ) {
                    _editor.onDidChangeModelContent( () => editorState.setValue( _editor.getValue() ) )
                    editorState.setValue( _editor.getValue() )
                    editorState.setEditor( _editor )
                }
                return _editor
            } )
        }

        return () => editor?.dispose()
    }, [ monacoEl.current ] )

    return <div ref={monacoEl} {...rest} />
}