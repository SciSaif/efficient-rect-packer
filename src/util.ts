import Configuration, { Margin, UnpackedRect } from "./configuration";

export enum PointType {
    BOTTOM_LEFT = 0,
    BOTTOM_RIGHT = 1,
    TOP_LEFT = 2,
    TOP_RIGHT = 3,
}

export function argmax(lst: number[]): number {
    return lst.indexOf(Math.max(...lst));
}

// function to add increase the width and height of the rects by the padding value
export const increaseDimensionsForPadding = (
    rects: UnpackedRect[],
    padding: number
) => {
    return rects.map((rect) => {
        return {
            id: rect.id,
            w: rect.w + padding + padding,
            h: rect.h + padding + padding,
        };
    });
};

export interface Rectangle {
    id: string;
    w: number;
    h: number;
    x: number;
    y: number;
    rotated: boolean;
}

export interface Result {
    packed_rectangles: Rectangle[];
    unpacked_rectangles: Rectangle[];
    isRemaining: boolean;
    error?: string;
}

export function getResult(C: Configuration, padding: number): Result {
    // Note: if there is padding, then we had added 2 x padding to the width and height of the rectangles
    // so now we need to subtract 2 x padding from the width and height of the rectangles
    // and shift the x and y coordinates by padding

    let rectangles_data: Rectangle[] = [];
    for (let rect of C.packed_rects) {
        let rectangle_info: Rectangle = {
            id: rect.id,
            w: rect.width - padding - padding,
            h: rect.height - padding - padding,
            x: rect.origin.x,
            y: rect.origin.y,
            rotated: rect.rotated,
        };
        rectangles_data.push(rectangle_info);
    }

    let remaining_rectangles_data: Rectangle[] = [];
    for (let rect of C.unpacked_rects) {
        let rectangle_info: Rectangle = {
            id: rect.id,
            w: rect.w - padding - padding,
            h: rect.h - padding - padding,
            x: 0,
            y: 0,
            rotated: false,
        };
        remaining_rectangles_data.push(rectangle_info);
    }

    return {
        packed_rectangles: rectangles_data,
        unpacked_rectangles: remaining_rectangles_data,
        isRemaining: C.unpacked_rects.length > 0,
    };
}

// function to check if any rectangle has dimensions greater than the container
export const checkIfRectanglesExceedContainer = (
    rects: UnpackedRect[],
    container_size: { w: number; h: number },
    margin: Margin
) => {
    // consider the margin as well
    return rects.some((rect) => {
        return (
            rect.w + margin.left + margin.right > container_size.w ||
            rect.h + margin.top + margin.bottom > container_size.h
        );
    });
};
