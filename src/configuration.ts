import Rect, { Point } from "./rect";
import { PointType } from "./util";
export interface UnpackedRect {
    id: string;
    w: number;
    h: number;
}
export interface Margin {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface Dimension {
    w: number;
    h: number;
}

export default class Configuration {
    private static readonly eps: number = 0.001; //The amount to look in each direction when determining if a corner is concave
    size: Dimension;
    unpacked_rects: UnpackedRect[];
    packed_rects: Rect[];
    L: Rect[] = [];
    concave_corners: [Point, PointType][] = [];
    margin: Margin;
    noRotation: boolean;
    constructor(
        size: Dimension,
        unpacked_rects: UnpackedRect[],
        packed_rects: Rect[] = [],
        margin: Margin,
        noRotation: boolean
    ) {
        this.size = size;
        this.noRotation = noRotation;
        this.unpacked_rects = unpacked_rects;
        this.packed_rects = packed_rects;
        this.margin = margin;
        this.generate_L();

        // console.log("total ccoas", this.L.length);
    }

    //   """
    //     A function that takes the current configuration, all the remaining rects and returns all
    //     possible CCOAs that can be fitted to the configuration
    //     Parameters
    //     ----------
    //     C: Configuration, required
    //         The current configuration

    //     remaining_rects: list[tuple], required:
    //         The dimensions of the rects yet to be packed. On the format: [w,h]
    //     """
    generate_L(): void {
        // 1. concave corners

        this.concave_corners = this.getConcaveCorners();

        // 2. generate ccoas for every rect
        const ccoas: Rect[] = [];
        for (let rect of this.unpacked_rects) {
            for (let [corner, type] of this.concave_corners) {
                if (this.noRotation) {
                    const ccoa = new Rect(
                        rect.id,
                        corner,
                        rect.w,
                        rect.h,
                        type,
                        false
                    );
                    // 3. Add if it fits
                    if (this.fits(ccoa)) {
                        ccoas.push(ccoa);
                    }
                } else {
                    for (let rotated of [false, true]) {
                        const ccoa = new Rect(
                            rect.id,
                            corner,
                            rect.w,
                            rect.h,
                            type,
                            rotated
                        );
                        // 3. Add if it fits
                        if (this.fits(ccoa)) {
                            ccoas.push(ccoa);
                        }
                    }
                }
            }
        }
        this.L = ccoas;
    }

    getConcaveCorners(): [Point, PointType][] {
        const concave_corners: [Point, PointType][] = [];
        for (let corner of this.getAllCorners()) {
            const corner_type = this.getCornerType(corner);

            if (corner_type !== null) {
                concave_corners.push([corner, corner_type]);
            }
        }
        return concave_corners;
    }

    getCornerType(p: Point): PointType | null {
        const checks = this.checkBoundaries(p);
        const sumChecks = checks.reduce((acc, val) => acc + (val ? 1 : 0), 0);
        // exactly 3 checks must be true for the point to be concave
        if (sumChecks === 3) {
            const index = checks.findIndex((x) => !x);
            return index as PointType;
        }
        return null;
    }

    checkBoundaries(p: Point): boolean[] {
        return [
            this.contains({
                x: p.x + Configuration.eps,
                y: p.y + Configuration.eps,
            }),
            this.contains({
                x: p.x - Configuration.eps,
                y: p.y + Configuration.eps,
            }),
            this.contains({
                x: p.x + Configuration.eps,
                y: p.y - Configuration.eps,
            }),
            this.contains({
                x: p.x - Configuration.eps,
                y: p.y - Configuration.eps,
            }),
        ];
    }

    // checks if a point is inside any of the rects
    contains(point: Point): boolean {
        if (
            point.x <= this.margin.left ||
            point.y <= this.margin.top ||
            this.size.w - this.margin.right <= point.x ||
            this.size.h - this.margin.bottom <= point.y
        ) {
            return true;
        }

        for (let r of this.packed_rects) {
            if (r.contains(point)) {
                return true;
            }
        }
        return false;
    }

    //   Returns true if a given ccoa fits into the configuration without overlapping any of the rects
    //   or being out of bounds
    fits(ccoa: Rect): boolean {
        // Check if the ccoa is out of bounds considering the container margins
        if (
            ccoa.origin.x < this.margin.left ||
            ccoa.origin.y < this.margin.top || // Origin is top-left
            this.size.w - this.margin.right < ccoa.origin.x + ccoa.width ||
            this.size.h - this.margin.bottom < ccoa.origin.y + ccoa.height
        ) {
            return false;
        }
        // Check if the rect overlaps any of the already packed rects without considering margins
        for (let rect of this.packed_rects) {
            if (ccoa.overlaps(rect)) {
                return false;
            }
        }
        return true;
    }

    placeRect(rect: Rect): void {
        // Add rect to packed rects
        this.packed_rects.push(rect);
        // Remove the rect from unpacked rects
        const index = this.unpacked_rects.findIndex(
            (r) =>
                (r.w === rect.width && r.h === rect.height) ||
                (r.w === rect.height && r.h === rect.width)
        );
        if (index !== -1) {
            this.unpacked_rects.splice(index, 1);
        }
        this.generate_L(); // TODO: Do somehing like passing the just placed rect for more efficiency
    }

    // Return the percentage of total container area filled by packed rects
    density(): number {
        const total_area = this.size.w * this.size.h;
        const occupied_area = this.packed_rects.reduce(
            (acc, rect) => acc + rect.area,
            0
        );
        return occupied_area / total_area;
    }

    getAllCorners(): Point[] {
        const corners: Point[] = [
            { x: this.margin.left, y: this.margin.top }, // Top-left corner
            { x: this.margin.left, y: this.size.h - this.margin.bottom }, // Bottom-left corner
            { x: this.size.w - this.margin.right, y: this.margin.top }, // Top-right corner
            {
                x: this.size.w - this.margin.right,
                y: this.size.h - this.margin.bottom,
            }, // Bottom-right corner
        ];

        // rect corners
        for (let rect of this.packed_rects) {
            corners.push(
                rect.corner_bot_l,
                rect.corner_bot_r,
                rect.corner_top_l,
                rect.corner_top_r
            );
        }

        // remove duplicates
        return Array.from(
            new Set(corners.map((corner) => JSON.stringify(corner)))
        ).map((str) => JSON.parse(str));
    }

    isSuccessful(): boolean {
        return this.unpacked_rects.length === 0;
    }

    clone(): Configuration {
        const cloned = new Configuration(
            this.size,
            [...this.unpacked_rects],
            [...this.packed_rects],
            this.margin,
            this.noRotation
        );
        cloned.L = [...this.L];
        cloned.concave_corners = [...this.concave_corners];
        return cloned;
    }
}
