import React, { useEffect, useState } from "react"
import { ModalBackdrop } from "./ModalBackdrop.js"

import { Store } from "../store/Store.js"

import classes from "./FileDialog.module.css"
import { useStoreKeys } from "../hooks/useStore.js"

function useDialogState<V>(
    store: Store<string, V>,
    initialName: string,
    filterAutoSave = false
) {
    const [ inputName, _setInputName ] = useState( initialName )
    const [ inputNamePreTab, setInputNamePreTab ] = useState<string>( initialName )

    let fileNames = useStoreKeys( store )
    if ( filterAutoSave )
        fileNames = fileNames.filter( name => !name.endsWith( "-autosave" ) )

    function setInputName( name: string ) {
        setInputNamePreTab( name )
        _setInputName( name )
    }

    function deleteFile() {
        store.set( inputName, undefined )

        // Select the next file
        const index = fileNames.indexOf( inputName )
        if ( index >= 0 && index < fileNames.length - 1 )
            setInputName( fileNames[ index + 1 ] )
        else if ( index >= 0 && index > 0 )
            setInputName( fileNames[ index - 1 ] )
        else
            setInputName( "" )
    }

    function tabComplete( e: React.KeyboardEvent<HTMLInputElement> ) {
        if ( e.key !== "Tab" )
            return

        // Prevent tab from changing focus
        e.preventDefault()

        let tabIndex = fileNames.indexOf( inputName )
        for ( let i = 1; i <= fileNames.length; i++ ) {
            const name = fileNames[ ( tabIndex + i ) % fileNames.length ]
            if ( name.startsWith( inputNamePreTab ) ) {
                _setInputName( name )
                return
            }
        }
    }

    return { inputName, setInputName, fileNames, deleteFile, tabComplete }
}

export function SaveDialog<V>( props: {
    getFileState: () => V,
    onSaved?: ( name: string ) => void,
    store: Store<string, V>,
    close: () => void,
    initialName: string
} ) {
    const dialogState = useDialogState( props.store, props.initialName, true )
    const { inputName, setInputName, fileNames } = dialogState

    function onSubmit() {
        props.store.set( inputName, props.getFileState() )
        props.onSaved?.( inputName )
        props.close()
    }

    return <ModalBackdrop onClickOutside={props.close} onEscape={props.close}>
        <div className={`${ classes.FileDialog }`}>
            <div className="font-l">Save</div>

            <div className={`${ classes.FileDialogList }`}>
                {fileNames.map( ( name ) => <FileEntry key={name} name={name} inputName={inputName} onClick={setInputName} /> )}
            </div>

            <DialogForm submitText="Save" onSubmit={onSubmit} dialogState={dialogState} />
        </div>
    </ModalBackdrop>
}

export function LoadDialog<V>( props: {
    setFileState: ( state: V ) => void,
    onLoaded?: ( name: string ) => void,
    store: Store<string, V>,
    close: () => void
} ) {
    const dialogState = useDialogState( props.store, "" )
    const { inputName, setInputName, fileNames } = dialogState

    function loadFile( name: string ) {
        props.setFileState( props.store.get( name )! )
        props.onLoaded?.( name )
        props.close()
    }

    return <ModalBackdrop onClickOutside={props.close} onEscape={props.close}>
        <div className={`${ classes.FileDialog }`}>
            <div className="font-l">Load</div>

            <div className={`${ classes.FileDialogList }`}>
                {fileNames.map( ( name ) => <FileEntry
                    key={name} name={name} inputName={inputName}
                    onClick={setInputName}
                    onDoubleClick={loadFile}
                /> )}
            </div>

            <DialogForm submitText="Load" onSubmit={() => loadFile( inputName )} dialogState={dialogState} />
        </div>
    </ModalBackdrop>
}

function DialogForm( props: {
    onSubmit: () => void,
    dialogState: ReturnType<typeof useDialogState>,
    submitText: string
} ) {
    const { onSubmit, dialogState } = props
    const { inputName, setInputName, deleteFile, tabComplete } = dialogState
    const onChange = ( e: React.ChangeEvent<HTMLInputElement> ) => {
        setInputName( e.target.value )
    }

    return <form className={`${ classes.FileDialogInput }`}
        onSubmit={( e ) => {
            e.preventDefault()
            onSubmit()
        }}
    >
        <input type="text" value={inputName} onChange={onChange} onKeyDown={tabComplete} autoFocus />
        <button onClick={onSubmit}>{props.submitText}</button>
        <button type="button" className="danger" onClick={deleteFile}>Delete</button>
    </form>
}

function FileEntry( props: {
    name: string,
    inputName: string,
    onClick: ( name: string ) => void
    onDoubleClick?: ( name: string ) => void
} ) {
    const ref = React.useRef<HTMLDivElement>( null )
    const { name, inputName, onClick } = props

    const partialMatch = inputName.length > 0 && name.startsWith( inputName )
    const fullmatch = inputName === name
    const rest = partialMatch ? name.slice( inputName.length ) : name
    const classNames: string[] = [ "font-bold" ]
    if ( fullmatch )
        classNames.push( "font-color-info" )

    useEffect( () => {
        if ( fullmatch && ref.current )
            ref.current.scrollIntoView( { block: "nearest" } )
    }, [ fullmatch ] )

    return <div
        ref={ref}
        onClick={() => onClick( name )}
        onDoubleClick={() => props.onDoubleClick?.( name )}
    >
        {partialMatch && <span className={classNames.join( " " )}>{inputName}</span>}
        <span>{rest}</span>
    </div>
}