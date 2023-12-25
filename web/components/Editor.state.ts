import { useEffect, useMemo, useState } from "react"
import { useLocal } from "../hooks/useLocal.js"
import { EditorType, useMonacoEditorState } from "./MonacoEditor.js"
import { ConversionOptions } from "../grammarToRegex.js"
import { SaveFile, defaultSave, fileStore, saveFromSharableLink, saveToSharableLink } from "../SaveFile.js"
import * as monaco from "monaco-editor"
import debounce from "../utils/debounce.js"
import { parseGrammarToRegexSource } from '../../src/index.js'
import { parseFunction } from "../utils/utils.js"


type DecorationsState = { decorations: string[] }

// High level editor state and transition logic
export function useEditorState() {

    // ==================
    // Editor state
    // ==================

    // File we're editing
    const [ fileName, setFileName ] = useLocal<string>( "fileName", "example" )

    // Text editor states
    const grammarState = useMonacoEditorState()
    const sampleTextState = useMonacoEditorState()
    const relacementTextState = useMonacoEditorState()

    // Compile options
    const [ conversionOptions, setConversionOptions ] = useState<ConversionOptions>( defaultSave.conversionOptions )
    const [ flags, setFlags ] = useState( defaultSave.flags )

    // Compile output
    const [ error, setError ] = useState<any>()
    const [ regexSource, setRegexSource ] = useState<string>()

    // Replacer options
    const [ replacementPattern, setReplacementPattern ] = useState( "" )
    const [ jsReplacer, setJsReplacer ] = useState( false )

    // ==================
    // Methods
    // ==================

    function getSaveFile(): SaveFile {
        return {
            grammarSource: grammarState.value,
            sampleText: sampleTextState.value,
            replacementPattern,
            flags,
            jsReplacer,
            conversionOptions
        }
    }
    function loadSaveFile( file: SaveFile ) {
        grammarState.setValue( file.grammarSource )
        sampleTextState.setValue( file.sampleText )
        setJsReplacer( file.jsReplacer ?? true )
        setFlags( file.flags ?? "gm" )
        setReplacementPattern( file.replacementPattern ?? "" )
        setConversionOptions( file.conversionOptions ?? { noNonCaptureGroups: false } )
    }
    async function copySharableLink() {
        const url = await saveToSharableLink( getSaveFile() )
        navigator.clipboard.writeText( url )
    }

    // ==================
    // Transitions
    // ==================

    // Initial load
    const editorsReady = grammarState.editor && sampleTextState.editor && relacementTextState.editor
    useEffect( () => {
        const urlSave = saveFromSharableLink( new URL( window.location.href ) )
        if ( urlSave ) {
            setFileName( "shared file" )
            loadSaveFile( urlSave )
            return
        }
        const previousSave = fileStore.get( fileName )
        if ( previousSave ) {
            loadSaveFile( previousSave )
            return
        }

        setFileName( "example" )
        loadSaveFile( defaultSave )

    }, [ editorsReady ] )

    // Compile grammar
    useEffect( () => {
        if ( grammarState.editor )
            compileDebounced( grammarState.editor, setError, setRegexSource, conversionOptions )
    }, [ grammarState.value, grammarState.editor, conversionOptions ] )

    // Update text search
    const decorationsState = useMemo<DecorationsState>( () => { return { decorations: [] } }, [] )
    useEffect( () => {
        if ( sampleTextState.editor ) {
            const model = sampleTextState.editor.getModel()
            if ( model )
                updateSearch( decorationsState, model, regexSource, flags, setError )
        }
    }, [ regexSource, sampleTextState.value, flags ] )

    // Update text repacement
    useEffect( () => {
        const replacementTextEditor = relacementTextState.editor
        if (
            replacementTextEditor && regexSource && sampleTextState.value &&
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
                    replacementTextEditor.setValue( sampleTextState.value.replace( regex, pattern ) )
                else
                    replacementTextEditor.setValue( `Invalid ${ jsReplacer ? "function" : "pattern" }` )
            } catch ( e ) {
                replacementTextEditor.setValue( e.toString() )
            }
        }
    }, [ regexSource, sampleTextState.value, replacementPattern, jsReplacer, flags, relacementTextState.editor ] )

    return {
        fileName, setFileName,
        grammarState, sampleTextState, relacementTextState,
        conversionOptions, setConversionOptions,
        flags, setFlags,
        error, setError,
        regexSource, setRegexSource,
        replacementPattern, setReplacementPattern,
        jsReplacer, setJsReplacer,
        getSaveFile, loadSaveFile,
        copySharableLink
    }
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
