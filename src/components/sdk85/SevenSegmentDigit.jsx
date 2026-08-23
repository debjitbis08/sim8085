import { For } from "solid-js";
import { SEGMENT_BITS } from "../../core/sdk85.js";

// The seven bars of a digit, drawn as flat hexagons so the mitres between a
// bar and its neighbours line up the way they do on a real display.
const SHAPES = {
    a: "16,4 44,4 48,8 44,12 16,12 12,8",
    b: "48,12 52,16 52,40 48,44 44,40 44,16",
    c: "48,52 52,56 52,80 48,84 44,80 44,56",
    d: "16,84 44,84 48,88 44,92 16,92 12,88",
    e: "12,52 16,56 16,80 12,84 8,80 8,56",
    f: "12,12 16,16 16,40 12,44 8,40 8,16",
    g: "16,44 44,44 48,48 44,52 16,52 12,48",
};

const SEGMENTS = Object.keys(SHAPES);

/**
 * One digit of the SDK-85's display, lit from a segment pattern as
 * decodeDisplaySegments returns it.
 */
export function SevenSegmentDigit(props) {
    const isLit = (segment) => (props.segments & SEGMENT_BITS[segment]) !== 0;

    return (
        <svg viewBox="0 0 60 100" class="h-16 w-10 md:h-20 md:w-12" role="img" aria-hidden="true">
            <g transform="skewX(-5)">
                <For each={SEGMENTS}>
                    {(segment) => (
                        <polygon
                            points={SHAPES[segment]}
                            fill={isLit(segment) ? "#ff4d3d" : "#3a1512"}
                            style={isLit(segment) ? { filter: "drop-shadow(0 0 3px #ff4d3d)" } : undefined}
                        />
                    )}
                </For>
            </g>
            <circle
                cx="56"
                cy="89"
                r="3.5"
                fill={props.dot ? "#ff4d3d" : "#3a1512"}
                style={props.dot ? { filter: "drop-shadow(0 0 3px #ff4d3d)" } : undefined}
            />
        </svg>
    );
}
