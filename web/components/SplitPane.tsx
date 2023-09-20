import React, { CSSProperties, HTMLAttributes, ReactNode, useRef, useMemo, useEffect } from "react"

import classes from "./SplitPane.module.css"
const directionToClass = { row: classes.AxisRow, column: classes.AxisColumn, long: classes.AxisLong, short: classes.AxisShort }

type Axis = "x" | "y"

type Direction =
    | "row"
    | "column"
    | "long"
    | "short"

type Properties =
    & HTMLAttributes<HTMLDivElement>
    & {
        /** The flex-direction to split along. The options `long` and `short` use the longest and shortest directions depending on viewport orientation. */
        direction?: Direction,
        /** The minimum fraction of the container a pane can take. */
        minSize?: number
    }

export function SplitPane( props: Properties ) {
    const {
        children: _children,
        direction = "row",
        style, className,
        minSize = 0.1,
        ...rest
    } = props

    const children = _children instanceof Array ? _children : [ _children ]
    const childCount = children.length

    const rootRef = useRef<HTMLDivElement>( null )
    const controller = useMemo( () => new SplitPaneController( rootRef, childCount, minSize ), [] )

    useEffect( () => controller.applyStyle(), [ rootRef.current, childCount ] )

    const axisClass = directionToClass[ direction ]

    return <div
        className={[ className, classes.SplitPane, axisClass ].join( " " )}
        ref={rootRef} {...rest}
        style={{ "--min-size": `${ minSize * 100 }%`, ...style } as CSSProperties}
    >
        {children.map(
            ( child, index ) =>
                <div
                    className={classes.Pane}
                    key={index}
                >
                    {child}
                    {
                        !isFinalChild( index ) && <div
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

    function isFinalChild( index ) { return index >= childCount - 1 }
}

class SplitPaneController {

    constructor(
        public rootRef: React.RefObject<HTMLDivElement>,
        public childCount: number,
        public minSize
    ) {
        this.sizes = new Array<number>( childCount ).fill( 1 / childCount )
    }
    public sizes: number[]
    public activePointer: number | null = null
    public initialMouseOffset: number = 0

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
            child.style.flexBasis = `${ this.sizes[ index ] * 100 }%`
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
        this.initialMouseOffset = this.mouseOffset( e )
    }

    onPointerUp( index: number, e: React.PointerEvent ) {
        this.activePointer = null
    }

    onPointerMove( index: number, e: React.PointerEvent ) {
        if ( this.isDragging() ) {
            const offset = this.mouseOffset( e )
            const deltaOffset = offset - this.initialMouseOffset
            this.resize( index, deltaOffset )
        }
    }

    mouseOffset( e: React.PointerEvent ) {
        const axis = this.flexAxis()
        if ( !axis ) return 0
        return mouseOffset( axis, e )
    }

}

function mouseOffset( axis: Axis, e: React.PointerEvent ) {
    if ( axis === "x" )
        return e.clientX - e.currentTarget.getBoundingClientRect().left
    return e.clientY - e.currentTarget.getBoundingClientRect().top
}

function minMagnitude( a: number, b: number ) {
    return Math.min( Math.abs( a ), Math.abs( b ) )
}