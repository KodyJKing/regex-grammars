import React, { CSSProperties, HTMLAttributes, ReactNode, useRef, useMemo, useEffect } from "react"

import classes from "./SplitPane.module.css"

type Axis = "x" | "y"

type Properties =
    & HTMLAttributes<HTMLDivElement>
    & {
    }

export function SplitPane( props: Properties ) {
    const { children: _children, style, className, ...rest } = props
    const children = _children instanceof Array ? _children : [ _children ]
    const childCount = children.length

    const rootRef = useRef<HTMLDivElement>( null )
    const controller = useMemo( () => new SplitPlaneController( rootRef, childCount ), [] )

    useEffect( () => controller.applyStyle(), [ rootRef.current, childCount ] )

    return <div
        className={[ className, classes.SplitPane, classes.AxisShort ].join( " " )}
        ref={rootRef} {...rest}
        style={{ ...style } as CSSProperties}
    >
        {children.map(
            ( child, index ) =>
                <div
                    className={classes.Pane}
                    key={index}
                >
                    {child}
                    {
                        !isFinal( index ) && <div
                            className={classes.DragHandle}
                            onPointerDown={e => controller.onPointerDown( index, e )}
                            onPointerUp={e => controller.onPointerUp( index, e )}
                            onPointerMove={e => controller.onPointerMove( index, e )}
                        >
                            <div className={classes.DragHandleIndicator} />
                        </div>
                    }
                </div>
        )}
    </div>

    function isFinal( index ) { return index >= childCount - 1 }
}

class SplitPlaneController {

    constructor(
        public rootRef: React.RefObject<HTMLDivElement>,
        public childCount: number,
        public sizes = new Array<number>( childCount ).fill( 1 / childCount ),
        public activePointer: number | null = null,
        public initialOffset: number = 0,
        public minSize = 0.1
    ) { }

    isDragging() { return this.activePointer !== null }
    root() { return this.rootRef.current }
    rootRect() { return this.rootRef.current?.getBoundingClientRect() }

    flexAxis() {
        const root = this.root()
        if ( !root ) return
        return getComputedStyle( root ).getPropertyValue( "flex-direction" ) === "row" ? "x" : "y"
    }

    applyStyle() {
        const root = this.root()
        if ( !root )
            return

        const panes = root.querySelectorAll( `.${ classes.Pane }` ) as NodeListOf<HTMLElement>

        panes.forEach( ( child, index ) => {
            child.style.flexBasis = this.sizes[ index ] * 100 + "%"
        } )
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

        this.applyStyle()
    }

    onPointerDown( index: number, e: React.PointerEvent ) {
        if ( this.isDragging() )
            return
        this.activePointer = e.pointerId
        e.currentTarget.setPointerCapture( e.pointerId )
        this.initialOffset = this.offset( e )
    }

    onPointerUp( index: number, e: React.PointerEvent ) {
        this.activePointer = null
    }

    onPointerMove( index: number, e: React.PointerEvent ) {
        if ( this.isDragging() ) {
            const offset = this.offset( e )
            const deltaOffset = offset - this.initialOffset
            this.resize( index, deltaOffset )
        }
    }

    offset( e: React.PointerEvent ) {
        const axis = this.flexAxis()
        if ( !axis ) return 0
        return getOffset( axis, e )
    }

}

function getOffset( axis: Axis, e: React.PointerEvent ) {
    if ( axis === "x" )
        return e.clientX - e.currentTarget.getBoundingClientRect().left
    return e.clientY - e.currentTarget.getBoundingClientRect().top
}

function minMagnitude( a: number, b: number ) {
    return Math.min( Math.abs( a ), Math.abs( b ) )
}