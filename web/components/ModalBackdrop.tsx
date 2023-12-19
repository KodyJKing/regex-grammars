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
                // Cover the entire screen
                position: "fixed",
                top: 0, left: 0,
                width: "100vw", height: "100vh",
                zIndex: 100,

                // 3x3 grid
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gridTemplateRows: "1fr auto 1fr",

                // Center the modal
                justifyItems: "center",
                alignItems: "center",

                backgroundColor: "rgba(0,0,0,0.5)",
            }}
            onMouseDown={props.onClickOutside}
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
            <div className="modal-backdrop__center-area"
                style={{ gridRow: 2, gridColumn: 2 }}
                onMouseDown={e => e.stopPropagation()}
            >
                {props.children}
            </div>
        </div>,
        document.getElementById( "modal-root" )!
    )
}