import React, { useRef, useState, useEffect, useMemo } from 'react'
import * as monaco from "monaco-editor"
import { PegexLanguageName } from '../language/pegex.js'
import { parseGrammarToRegexSource } from '../../src/index.js'
import debounce, { debouncer } from '../utils/debounce.js'
import { EditorType, MonacoEditor } from './MonacoEditor.js'
import { Resizable } from './Resizable.js'
import { useIsLandscape } from '../hooks/useSize.js'
import { CheckBox } from './CheckBox.js'
import { ConversionOptions } from '../grammarToRegex.js'
import { Input } from './Input.js'
import { parseFunction } from '../utils/utils.js'
import { LoadDialog, SaveDialog } from './FileDialog.js'
import { LocalStore, defaultLocalStore } from '../store/LocalStore.js'

import classes from "./Editor.module.css"
import { SaveFile, defaultSave, fileStore, saveFromSharableLink, saveToSharableLink } from '../SaveFile.js'
import { useLocal } from '../hooks/useLocal.js'

type DecorationsState = { decorations: string[] }

const editorSettings: monaco.editor.IStandaloneEditorConstructionOptions = {
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    overviewRulerBorder: false,
}

const editorStyle: React.CSSProperties = {
    flex: "1 1 200px", minWidth: "400px", minHeight: "200px"
}

export function Editor() {

    // Todo: Refactor this cludgy state management.

    const urlSave = useMemo( () => saveFromSharableLink( new URL( window.location.href ) ), [] )
    const [ fileName, setFileName ] = useLocal<string>( "fileName", "untitled", urlSave !== null )
    const previousSave = useMemo( () => fileStore.get( fileName ), [] )
    const saveFile = urlSave ?? previousSave ?? defaultSave

    const [ grammarSource, setGrammarSource_raw ] = useState<string>( saveFile.grammarSource )
    const [ grammarTextEditor, setGrammarEditor ] = useState<EditorType>()
    const [ conversionOptions, setConversionOptions ] = useState( saveFile.conversionOptions )
    function setGrammarSource( source: string ) {
        setGrammarSource_raw( source )
        grammarTextEditor?.setValue( source )
    }

    const [ flags, setFlags ] = useState( saveFile.flags )

    const [ error, setError ] = useState<any>()
    const [ regexSource, setRegexSource ] = useState<string>()

    const [ sampleTextEditor, setTextEditor ] = useState<EditorType>()
    const [ sampleText, setSampleText_raw ] = useState( saveFile.sampleText )
    function setSampleText( source: string ) {
        setSampleText_raw( source )
        sampleTextEditor?.setValue( source )
    }

    const [ replacementTextEditor, setReplacementTextEditor ] = useState<EditorType>()
    const [ replacementPattern, setReplacementPattern ] = useState( saveFile.replacementPattern )
    const [ jsReplacer, setJsReplacer ] = useState( saveFile.jsReplacer )

    const [ saveDialogOpen, setSaveDialogOpen ] = useState( false )
    const [ loadDialogOpen, setLoadDialogOpen ] = useState( false )

    const decorationsState = useMemo<DecorationsState>( () => { return { decorations: [] } }, [] )

    const ref = useRef<HTMLDivElement>( null )
    const landscape = useIsLandscape( ref )

    function getSaveFile(): SaveFile {
        return { grammarSource, sampleText, replacementPattern, flags, jsReplacer, conversionOptions }
    }
    function setFromSaveFile( file: SaveFile ) {
        setGrammarSource( file.grammarSource )
        setSampleText( file.sampleText )
        setJsReplacer( file.jsReplacer ?? true )
        setFlags( file.flags ?? "gm" )
        setReplacementPattern( file.replacementPattern ?? "" )
        setConversionOptions( file.conversionOptions ?? { noNonCaptureGroups: false } )
    }
    async function copySharableLink() {
        const url = await saveToSharableLink( getSaveFile() )
        navigator.clipboard.writeText( url )
    }

    // Compile grammar
    useEffect( () => {
        if ( grammarTextEditor )
            compileDebounced( grammarTextEditor, setError, setRegexSource, conversionOptions )
    }, [ grammarSource, conversionOptions, grammarTextEditor ] )

    // Update text search
    useEffect( () => {
        if ( sampleTextEditor ) {
            const model = sampleTextEditor.getModel()
            if ( model )
                updateSearch( decorationsState, model, regexSource, flags, setError )
        }
    }, [ regexSource, sampleText, flags ] )

    // Update text repacement
    useEffect( () => {
        if (
            replacementTextEditor && regexSource && sampleText &&
            replacementPattern !== undefined
        ) {
            const model = replacementTextEditor.getModel()
            if ( !model )
                return

            try {
                const regex = new RegExp( regexSource, flags )
                const pattern = jsReplacer ? parseFunction( replacementPattern ) : replacementPattern
                if ( pattern !== undefined )
                    // @ts-ignore
                    replacementTextEditor.setValue( sampleText.replace( regex, pattern ) )
                else
                    replacementTextEditor.setValue( `Invalid ${ jsReplacer ? "function" : "pattern" }` )
            } catch ( e ) {
                replacementTextEditor.setValue( e.toString() )
            }
        }
    }, [ regexSource, sampleText, replacementPattern, jsReplacer, flags, replacementTextEditor ] )

    return <div ref={ref} className="fill flex-column"
        onKeyDown={e => {
            if ( e.key === "s" && e.ctrlKey ) {
                setSaveDialogOpen( true )
                e.preventDefault()
            }
            if ( e.key === "o" && e.ctrlKey ) {
                setLoadDialogOpen( true )
                e.preventDefault()
            }
        }}
    >

        {saveDialogOpen && <SaveDialog
            initialName={fileName}
            getFileState={getSaveFile}
            onSaved={setFileName}
            store={fileStore}
            close={() => setSaveDialogOpen( false )}
        />}
        {loadDialogOpen && <LoadDialog
            onLoaded={setFileName}
            setFileState={setFromSaveFile}
            store={fileStore}
            close={() => setLoadDialogOpen( false )}
        />}

        <MenuBar
            openSaveDialog={() => setSaveDialogOpen( true )}
            openLoadDialog={() => setLoadDialogOpen( true )}
            copySharableLink={copySharableLink}
            fileName={fileName}
        />

        <OutputBar {...{ error, regexSource, flags }} />

        <div className="flex-long-axis" style={{ flex: "1 1 auto", gap: "1px 1px", maxHeight: "calc(100% - 40px)" }} >

            {/* Primary pane */}
            <div className="flex-column" style={{ flex: "1 1 200px", minWidth: "400px", minHeight: "200px" }}>

                <OptionsInput {...{
                    flags, setFlags,
                    conversionOptions,
                    setConversionOptions
                }} />

                {/* Grammar editor */}
                <MonacoEditor
                    style={editorStyle}
                    onEditor={setGrammarEditor}
                    onChanged={setGrammarSource_raw}
                    options={{ value: saveFile.grammarSource, language: PegexLanguageName, ...editorSettings }}
                />

            </div>

            {/* Secondary pane */}
            <Resizable flex
                style={{ alignSelf: "stretch", flex: "1", gap: "1px 1px" }}
                className="flex-short-axis"
                left={landscape} top={!landscape}
                minWidth={25} minHeight={25}
            >

                {/* Test input editor */}
                <MonacoEditor
                    style={editorStyle}
                    onChanged={setSampleText_raw}
                    onEditor={setTextEditor}
                    options={{
                        value: saveFile.sampleText, renderWhitespace: "all",
                        language: "plaintext", ...editorSettings
                    }}
                />

                <Resizable flex
                    className="flex-column bg-gray-2"
                    style={{ alignSelf: "stretch", flex: "1" }}
                    left={!landscape} top={landscape}
                    minWidth={25} minHeight={25}
                >
                    <PatternInput
                        patternState={[ replacementPattern, setReplacementPattern ]}
                        jsState={[ jsReplacer, setJsReplacer ]}
                    />
                    {/* Replacement editor */}
                    <MonacoEditor
                        style={editorStyle}
                        onEditor={setReplacementTextEditor}
                        options={{
                            value: "", readOnly: true, renderWhitespace: "all",
                            language: "plaintext", ...editorSettings
                        }}
                    />
                </Resizable>

            </Resizable>
        </div>

    </div>
}

function MenuBar( props: {
    openSaveDialog: () => void,
    openLoadDialog: () => void,
    copySharableLink: () => void,
    fileName: string
} ) {
    return <div className={classes.MenuBar}>
        <button onClick={props.openSaveDialog}>Save</button>
        <button onClick={props.openLoadDialog}>Load</button>
        <button title="copy link to clipboard" onClick={props.copySharableLink}>Share</button>
        <div className={classes.MenuBarTitle}>{props.fileName}</div>
    </div>
}

function OutputBar( { error, regexSource, flags } ) {
    return <div
        className="flex-column align-center bg-gray-1 pad-m center-text"
        style={{
            flex: "0 0 40px", userSelect: error ? "initial" : "all", justifyContent: "center",
            color: error ? "var(--color-error)" : undefined
        }}
    >
        {error ?? `/${ regexSource }/${ flags }`}
    </div>
}

function OptionsInput( { flags, setFlags, conversionOptions, setConversionOptions } ) {
    return <div
        className="flex-row flex-center bg-gray-1 pad-m"
        style={{ margin: "1px 0px 0px 0px", gap: "4px", fontSize: "12px" }}
    >
        <label className="no-select">Flags:</label>
        <Input value={flags} setValue={setFlags} pattern={/^(?:([gmiyuvsd])(?!.*\1))*$/} />
        <CheckBox
            label="Always use capture groups"
            title="Replaces non-capture groups with capture groups to reduce size."
            value={conversionOptions.noNonCaptureGroups}
            setValue={value => setConversionOptions( oldOptions => {
                return { ...oldOptions, noNonCaptureGroups: value }
            } )}
        />
    </div>
}

function PatternInput( props: { patternState, jsState } ) {
    const {
        patternState: [ replacementPattern, setReplacementPattern ],
        jsState: [ jsReplacer, setJsReplacer ]
    } = props
    return <div className="flex-row flex-center bg-gray-1 pad-m" >
        <Input
            placeholder="replacement pattern or function"
            title="The pattern or function passed to String.replace(regex, patternOrFunction)"
            value={replacementPattern} setValue={setReplacementPattern}
        />
        <CheckBox
            label="JS" title="Interpret pattern as JS replacer function."
            value={jsReplacer} setValue={setJsReplacer}
        />
    </div>
}

const compileDebounced = debounce(
    50 /* milliseconds */,
    function compile(
        editor: EditorType,
        setError: ( output: any ) => void,
        setRegexSource: ( regexSource: string | undefined ) => void,
        conversionOptions: ConversionOptions
    ) {
        let model = editor.getModel()
        if ( !model )
            return

        try {

            let source = model.getValue()
            let regexSource = parseGrammarToRegexSource( source, conversionOptions )
            setError( undefined )
            setRegexSource( regexSource )
            monaco.editor.setModelMarkers( model, "owner", [] )

        } catch ( e ) {

            let message = e.toString()

            setError( message )
            setRegexSource( undefined )

            let { location } = e
            if ( !location ) return
            let { start, end } = location

            monaco.editor.setModelMarkers( model, "owner", [ {
                severity: monaco.MarkerSeverity.Error,
                message: message,
                startColumn: start.column,
                startLineNumber: start.line,
                endColumn: end.column,
                endLineNumber: end.line,
            } ] )

        }

    }
)

function updateSearch(
    state: DecorationsState,
    model: monaco.editor.ITextModel,
    regexSource: string | undefined,
    flags: string,
    setError: ( output: any ) => void
) {
    if ( !regexSource ) {
        state.decorations = model.deltaDecorations( state.decorations, [] )
        return
    }

    const classNames = [ "highlighted-text-1", "highlighted-text-2" ]

    const modelText = model.getValue()

    let regex: RegExp
    try {
        regex = new RegExp( regexSource, flags )
    } catch ( e ) {
        setError( e.toString() )
        return
    }

    const matches = regex.global
        ? Array.from( modelText.matchAll( regex ) )
        : [ modelText.match( regex ) ].filter( m => m ) as [ RegExpMatchArray ]

    state.decorations = model.deltaDecorations(
        state.decorations,
        matches.map( ( match, i ) => {
            return {
                range: matchRange( match ),
                options: {
                    inlineClassName: classNames[ i % 2 ],
                    hoverMessage: { value: getMatchTable( match ) }
                }
            }
        } )
    )

    function getMatchTable( match: RegExpMatchArray ) {
        let lines: string[] = []

        function line( key, value ) { lines.push( `| ${ escapeMarkdown( key ) } | \`${ escapeMarkdown( value ) }\` |` ) }
        function escapeMarkdown( str: string ) {
            if ( !str ) return str
            return str.replaceAll( /[\[\]\{\}\(\)\<\>\|\#\+\-\.\!\`\*\_\\]/g, "\\$&" )
        }

        for ( let i = 0; i < match.length; i++ )
            line( `$${ i === 0 ? "&" : i }`, match[ i ] )

        if ( match.groups )
            for ( let [ key, val ] of Object.entries( match.groups ) )
                line( `$<${ key }>`, val )

        return `|group|text|\n|:-|:-|\n${ lines.join( "\n" ) }`
    }

    function matchRange( match: RegExpMatchArray ) {
        const start = match.index ?? 0
        const end = start + match[ 0 ].length
        const startPos = model.getPositionAt( start )
        const endPos = model.getPositionAt( end )
        return new monaco.Range(
            startPos.lineNumber, startPos.column,
            endPos.lineNumber, endPos.column
        )
    }
}
