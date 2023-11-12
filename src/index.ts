import { BinPacker } from "./binPacker";
import Configuration, {
    Dimension,
    Margin,
    UnpackedRect,
} from "./configuration";
import {
    Rectangle,
    Result,
    checkIfRectanglesExceedContainer,
    getResult,
    increaseDimensionsForPadding,
} from "./util";

export interface Options {
    padding?: number;
    margin?: Margin;
    noRotation?: boolean;
}

/**
 * Packs a set of rectangles into a container.
 *
 * @param rects - Array of rectangles to pack.
 * @param container_size - The size of the container.
 * @param options - Packing options, including padding, margin, and rotation settings.
 * @returns A promise that resolves to the packing result.
 */
export const pack = async (
    rects: UnpackedRect[],
    container_size: Dimension,
    options: Options = {}
): Promise<Result> => {
    // Set default values for options
    const {
        padding = 0,
        margin = { top: 0, right: 0, bottom: 0, left: 0 },
        noRotation = false,
    } = options;

    return new Promise((resolve) => {
        setTimeout(() => {
            if (
                checkIfRectanglesExceedContainer(rects, container_size, margin)
            ) {
                console.log(rects, container_size, margin);

                resolve({
                    packed_rectangles: [],
                    unpacked_rectangles: rects.map((rect) => {
                        return {
                            id: rect.id,
                            w: rect.w,
                            h: rect.h,
                            x: 0,
                            y: 0,
                            rotated: false,
                        };
                    }),
                    isRemaining: true,
                    error: "Some rectangles exceed available container width or height",
                });
            }

            if (padding > 0) {
                rects = increaseDimensionsForPadding(rects, padding);
                container_size.w += padding + padding;
                container_size.h += padding + padding;
            }

            const C = new Configuration(
                container_size,
                [...rects],
                [],
                margin,
                noRotation
            );

            const packer = new BinPacker(C);

            const packedConfig = packer.PackConfiguration(C);

            resolve(getResult(packedConfig, padding));
        }, 0); // setTimeout with 0ms delay to make it asynchronous
    });
};

export { Dimension, Margin, UnpackedRect, Result };
