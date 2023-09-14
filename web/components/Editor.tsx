import React, { useRef, useState, useEffect } from 'react'
import * as monaco from "monaco-editor"
import styles from './Editor.module.css'
import { PegexLanguageName, registerPegexLanguage } from '../language/pegex.js'
import { undent } from '../../src/utils/stringUtils.js'
import { parseGrammar } from '../../src/index.js'
import debounce from '../utils/debounce.js'

type IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor

export function Editor() {
    const [ editor, setEditor ] = useState<IStandaloneCodeEditor | null>( null )
    const monacoEl = useRef( null )

    useEffect( () => {
        if ( monacoEl ) {
            setEditor( ( editor ) => {
                if ( editor ) {
                    return editor
                }

                registerPegexLanguage()

                const _editor = monaco.editor.create( monacoEl.current!, {
                    value: sampleSoure,
                    language: PegexLanguageName,
                    theme: "vs-dark",
                    automaticLayout: true
                } )

                _editor.onDidChangeModelContent( () => checkErrors( _editor ) )

                return _editor
            } )
        }

        return () => editor?.dispose()
    }, [ monacoEl.current ] )

    return <div className={styles.Editor} ref={monacoEl}></div>
}

const checkErrors = debounce(
    100 /* milliseconds */,
    function checkErrors( editor: IStandaloneCodeEditor ) {
        let model = editor.getModel()
        if ( !model )
            return
        let source = model.getValue()

        try {
            let ast = parseGrammar( source )
            monaco.editor.setModelMarkers( model, "owner", [] )
        } catch ( e ) {
            let { location: { start, end } } = e
            if ( !location )
                return
            monaco.editor.setModelMarkers( model, "owner", [ {
                severity: monaco.MarkerSeverity.Error,
                message: e.toString(),
                startColumn: start.column,
                startLineNumber: start.line,
                endColumn: end.column,
                endLineNumber: end.line,
            } ] )
        }

    }
)

const sampleSoure = undent( `
    /*
     *  Parse a date in the MM/DD/YYYY format.
     *  Uses named capture groups for month, day and year.
     */

    Date
        = month: MM "/" day: DD "/" year: YYYY
        
    DD
        = [0-2][0-9]
    
    MM
        = [0-1][0-9]

    YYYY
        = \\d|4|
`)