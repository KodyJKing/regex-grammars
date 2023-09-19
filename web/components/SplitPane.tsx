import React, { CSSProperties, HTMLAttributes, ReactNode, useRef, useMemo } from "react"

import classes from "./SplitPane.module.css"

type Properties =
    & HTMLAttributes<HTMLDivElement>
    & {
    }

export function SplitPane( props: Properties ) {
    const { children: _children, style, ...rest } = props

    const children = _children instanceof Array ? _children : [ _children ]
    const childCount = children.length

    const rootRef = useRef<HTMLDivElement>( null )
    const controller = useMemo( () => new Controller( rootRef, childCount ), [] )

    function isFinal( index ) { return index >= childCount - 1 }

    return <div
        ref={rootRef} {...rest}
        style={{
            ...style,
            display: "grid",
            gridTemplateColumns: controller.gridTemplateColumns(),
        }}
    >
        {children.map(
            ( child, index ) =>
                // Pane
                <div key={index}
                    style={{
                        width: "100%", height: "100%",
                        position: "relative",
                        overflow: "hidden"
                    }}
                >
                    {child}
                    {/* DragHandle */}
                    {!isFinal( index ) && <div
                        className={classes.DragHandle}
                        style={{
                            position: "absolute", right: "0", top: "0",
                            height: "100%", width: "20px",
                            transform: "translateX(50%)",
                            cursor: "col-resize",
                            zIndex: "1"
                        }}
                        onPointerDown={e => controller.onPointerDown( index, e )}
                        onPointerUp={e => controller.onPointerUp( index, e )}
                        onPointerMove={e => controller.onPointerMove( index, e )}
                    >
                        {/* DragHandleIndicator */}
                        <div
                            style={{
                                height: "100%", width: "2px",
                                position: "absolute", left: "50%",
                                transform: "translateX(-50%)",
                                backgroundColor: "white",
                            }}
                        />
                    </div>}

                </div>
        )}
    </div>

}

class Controller {

    constructor(
        public rootRef: React.RefObject<HTMLDivElement>,
        public childCount: number,
        public sizes = new Array<number>( childCount ).fill( 1 / childCount ),
        public activePointer: number | null = null,
        public initialOffset: number = 0,
        public minSize = 0.1
    ) { }

    isDragging() { return this.activePointer !== null }

    gridTemplateColumns() {
        return this.sizes.map( size => `${ size * 100 }%` ).join( " " )
    }

    rootRect() {
        return this.rootRef.current?.getBoundingClientRect()
    }

    resize( index: number, deltaPixels: number ) {
        if ( index >= this.childCount - 1 )
            throw new Error( "Cannot resize final child." )

        const root = this.rootRef.current
        if ( !root )
            return

        const i = index + 0
        const j = index + 1

        let deltaPercent = deltaPixels / this.rootRect()!.width
        {
            const sizeI = this.sizes[ i ]
            const sizeJ = this.sizes[ j ]
            const sizeI2 = Math.max( sizeI + deltaPercent, this.minSize )
            const sizeJ2 = Math.max( sizeJ - deltaPercent, this.minSize )

            // Clamp delta percentage to respect min sizes.
            deltaPercent = Math.sign( deltaPercent ) * minMagnitude( sizeI2 - sizeI, sizeJ2 - sizeJ )
        }

        this.sizes[ i ] += deltaPercent
        this.sizes[ j ] -= deltaPercent

        root.style.gridTemplateColumns = this.gridTemplateColumns()
    }

    onPointerDown( index: number, e: React.PointerEvent ) {
        if ( this.isDragging() )
            return
        this.activePointer = e.pointerId
        e.currentTarget.setPointerCapture( e.pointerId )
        this.initialOffset = e.clientX - e.currentTarget.getBoundingClientRect().left
    }

    onPointerUp( index: number, e: React.PointerEvent ) {
        this.activePointer = null
    }

    onPointerMove( index: number, e: React.PointerEvent ) {
        if ( this.isDragging() ) {
            const offset = e.clientX - e.currentTarget.getBoundingClientRect().left
            const deltaOffset = offset - this.initialOffset
            this.resize( index, deltaOffset )
        }
    }

}

function minMagnitude( a: number, b: number ) {
    return Math.min( Math.abs( a ), Math.abs( b ) )
}