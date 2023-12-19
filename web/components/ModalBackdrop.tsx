import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom"

export function ModalBackdrop( props: {
    children: React.ReactNode,
    onClickOutside?: () => void
    onEscape?: () => void
} ) {

    const previousFocus = useRef<HTMLElement>()

    useEffect( () => {
        return () => {
            // console.log( "Restoring previous focus", previousFocus.current )
            previousFocus.current?.focus()
        }
    }, [] )

    return createPortal(
        <div className="modal-backdrop"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "rgba(0,0,0,0.5)",
                zIndex: 100,
            }}
            onClick={props.onClickOutside}
            onKeyDown={e => {
                if ( e.key === "Escape" ) {
                    props.onEscape?.()
                }
            }}
            onFocusCapture={e => {
                if ( e.relatedTarget instanceof HTMLElement ) {
                    // Ignore focus events from within the modal
                    if ( e.relatedTarget.closest( ".modal-backdrop" ) )
                        return
                    // console.log( "Saving previous focus", e.relatedTarget )
                    previousFocus.current = e.relatedTarget
                }
            }}
        >
            <div className="modal-backdrop__center"
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                }}
                onClick={e => e.stopPropagation()}
            >
                {props.children}
            </div>
        </div>,
        document.getElementById( "modal-root" )!
    )
}