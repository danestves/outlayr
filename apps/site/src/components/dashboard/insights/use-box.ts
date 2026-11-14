import { useLayoutEffect, useRef, useState } from "react";

interface Box {
    height: number;
    width: number;
}

const NO_BOX: Box = { height: 0, width: 0 };

/** The size an element is laid out at, so a chart can be drawn in real pixels. `before` stands in until measured. */
export function useBox<Element extends HTMLElement = HTMLDivElement>(before: Box = NO_BOX) {
    const ref = useRef<Element>(null);
    const [box, setBox] = useState(before);
    // oxlint-disable-next-line outlayr/react-effect-budget -- the size of an element can only be read after layout.
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }
        const read = () =>
            setBox((last) =>
                last.height === element.clientHeight && last.width === element.clientWidth
                    ? last
                    : { height: element.clientHeight, width: element.clientWidth }
            );
        read();
        const observer = new ResizeObserver(read);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    return [ref, box] as const;
}
