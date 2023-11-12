'use strict';

var PointType;
(function (PointType) {
    PointType[PointType["BOTTOM_LEFT"] = 0] = "BOTTOM_LEFT";
    PointType[PointType["BOTTOM_RIGHT"] = 1] = "BOTTOM_RIGHT";
    PointType[PointType["TOP_LEFT"] = 2] = "TOP_LEFT";
    PointType[PointType["TOP_RIGHT"] = 3] = "TOP_RIGHT";
})(PointType || (PointType = {}));
function argmax(lst) {
    return lst.indexOf(Math.max(...lst));
}
// function to add increase the width and height of the rects by the padding value
const increaseDimensionsForPadding = (rects, padding) => {
    return rects.map((rect) => {
        return {
            id: rect.id,
            w: rect.w + padding + padding,
            h: rect.h + padding + padding,
        };
    });
};
function getResult(C, padding) {
    // Note: if there is padding, then we had added 2 x padding to the width and height of the rectangles
    // so now we need to subtract 2 x padding from the width and height of the rectangles
    // and shift the x and y coordinates by padding
    let rectangles_data = [];
    for (let rect of C.packed_rects) {
        let rectangle_info = {
            id: rect.id,
            w: rect.width - padding - padding,
            h: rect.height - padding - padding,
            x: rect.origin.x,
            y: rect.origin.y,
            rotated: rect.rotated,
        };
        rectangles_data.push(rectangle_info);
    }
    let remaining_rectangles_data = [];
    for (let rect of C.unpacked_rects) {
        let rectangle_info = {
            id: rect.id,
            w: rect.w - padding - padding,
            h: rect.h - padding - padding,
            x: 0,
            y: 0,
            rotated: false,
        };
        remaining_rectangles_data.push(rectangle_info);
    }
    console.log("packed", rectangles_data);
    console.log("unpacked", remaining_rectangles_data);
    return {
        packed_rectangles: rectangles_data,
        unpacked_rectangles: remaining_rectangles_data,
        isRemaining: C.unpacked_rects.length > 0,
    };
}
// function to check if any rectangle has dimensions greater than the container
const checkIfRectanglesExceedContainer = (rects, container_size, margin) => {
    // consider the margin as well
    return rects.some((rect) => {
        return (rect.w + margin.left + margin.right > container_size.w ||
            rect.h + margin.top + margin.bottom > container_size.h);
    });
};

class Rect {
    constructor(id, origin, width, height, origin_type = PointType.BOTTOM_LEFT, rotated = false) {
        this.id = id;
        if (rotated) {
            [height, width] = [width, height];
        }
        switch (origin_type) {
            case PointType.BOTTOM_LEFT:
                this.origin = origin;
                break;
            case PointType.TOP_LEFT:
                this.origin = { x: origin.x, y: origin.y - height };
                break;
            case PointType.BOTTOM_RIGHT:
                this.origin = { x: origin.x - width, y: origin.y };
                break;
            case PointType.TOP_RIGHT:
                this.origin = { x: origin.x - width, y: origin.y - height };
                break;
        }
        this.width = width;
        this.height = height;
        this.rotated = rotated;
        this.bottom = this.origin.y;
        this.top = this.origin.y + this.height;
        this.left = this.origin.x;
        this.right = this.origin.x + this.width;
        this.corner_bot_l = { x: this.left, y: this.bottom };
        this.corner_top_l = { x: this.left, y: this.top };
        this.corner_top_r = { x: this.right, y: this.top };
        this.corner_bot_r = { x: this.right, y: this.bottom };
    }
    get area() {
        return this.width * this.height;
    }
    contains(point) {
        return (this.corner_bot_l.x <= point.x &&
            this.corner_bot_l.y <= point.y &&
            point.x <= this.corner_top_r.x &&
            point.y <= this.corner_top_r.y);
    }
    min_distance(other) {
        const outer_left = Math.min(this.left, other.left);
        const outer_right = Math.max(this.right, other.right);
        const outer_bottom = Math.min(this.bottom, other.bottom);
        const outer_top = Math.max(this.top, other.top);
        const outer_width = outer_right - outer_left;
        const outer_height = outer_top - outer_bottom;
        const inner_width = Math.max(0, outer_width - this.width - other.width);
        const inner_height = Math.max(0, outer_height - this.height - other.height);
        return Math.sqrt(Math.pow(inner_width, 2) + Math.pow(inner_height, 2));
    }
    overlaps(other) {
        // console.log("overlap", this, other, padding);
        if (this.right <= other.left || other.right <= this.left) {
            return false;
        }
        if (this.top <= other.bottom || other.top <= this.bottom) {
            return false;
        }
        return true;
    }
    // overlaps(other: Rect, padding: number = 0): boolean {
    //     if (
    //         this.right + padding <= other.left ||
    //         other.right + padding <= this.left
    //     ) {
    //         return false;
    //     }
    //     if (
    //         this.top + padding <= other.bottom ||
    //         other.top + padding <= this.bottom
    //     ) {
    //         return false;
    //     }
    //     return true;
    // }
    *[Symbol.iterator]() {
        yield this.corner_bot_l;
        yield this.corner_top_l;
        yield this.corner_top_r;
        yield this.corner_bot_r;
    }
    toString() {
        return `R = ((${this.origin.x}, ${this.origin.y}), w=${this.width}, h=${this.height}, r=${this.rotated})`;
    }
}

class Configuration {
    constructor(size, unpacked_rects, packed_rects = [], margin, noRotation) {
        this.L = [];
        this.concave_corners = [];
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
    generate_L() {
        // 1. concave corners
        this.concave_corners = this.getConcaveCorners();
        // 2. generate ccoas for every rect
        const ccoas = [];
        for (let rect of this.unpacked_rects) {
            for (let [corner, type] of this.concave_corners) {
                if (this.noRotation) {
                    const ccoa = new Rect(rect.id, corner, rect.w, rect.h, type, false);
                    // 3. Add if it fits
                    if (this.fits(ccoa)) {
                        // console.log("fits");
                        ccoas.push(ccoa);
                    }
                }
                else {
                    for (let rotated of [false, true]) {
                        const ccoa = new Rect(rect.id, corner, rect.w, rect.h, type, rotated);
                        // 3. Add if it fits
                        if (this.fits(ccoa)) {
                            // console.log("fits");
                            ccoas.push(ccoa);
                        }
                    }
                }
            }
        }
        this.L = ccoas;
    }
    getConcaveCorners() {
        const concave_corners = [];
        for (let corner of this.getAllCorners()) {
            const corner_type = this.getCornerType(corner);
            if (corner_type !== null) {
                concave_corners.push([corner, corner_type]);
            }
        }
        return concave_corners;
    }
    getCornerType(p) {
        const checks = this.checkBoundaries(p);
        const sumChecks = checks.reduce((acc, val) => acc + (val ? 1 : 0), 0);
        // exactly 3 checks must be true for the point to be concave
        if (sumChecks === 3) {
            const index = checks.findIndex((x) => !x);
            return index;
        }
        return null;
    }
    checkBoundaries(p) {
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
    contains(point) {
        if (point.x <= this.margin.left ||
            point.y <= this.margin.top ||
            this.size.w - this.margin.right <= point.x ||
            this.size.h - this.margin.bottom <= point.y) {
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
    fits(ccoa) {
        // Check if the ccoa is out of bounds considering the container margins
        if (ccoa.origin.x < this.margin.left ||
            ccoa.origin.y < this.margin.top || // Origin is top-left
            this.size.w - this.margin.right < ccoa.origin.x + ccoa.width ||
            this.size.h - this.margin.bottom < ccoa.origin.y + ccoa.height) {
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
    placeRect(rect) {
        // Add rect to packed rects
        this.packed_rects.push(rect);
        // Remove the rect from unpacked rects
        const index = this.unpacked_rects.findIndex((r) => (r.w === rect.width && r.h === rect.height) ||
            (r.w === rect.height && r.h === rect.width));
        if (index !== -1) {
            this.unpacked_rects.splice(index, 1);
        }
        this.generate_L(); // TODO: Do somehing like passing the just placed rect for more efficiency
    }
    // Return the percentage of total container area filled by packed rects
    density() {
        const total_area = this.size.w * this.size.h;
        const occupied_area = this.packed_rects.reduce((acc, rect) => acc + rect.area, 0);
        return occupied_area / total_area;
    }
    getAllCorners() {
        const corners = [
            { x: this.margin.left, y: this.margin.top },
            { x: this.margin.left, y: this.size.h - this.margin.bottom },
            { x: this.size.w - this.margin.right, y: this.margin.top },
            {
                x: this.size.w - this.margin.right,
                y: this.size.h - this.margin.bottom,
            }, // Bottom-right corner
        ];
        // rect corners
        for (let rect of this.packed_rects) {
            corners.push(rect.corner_bot_l, rect.corner_bot_r, rect.corner_top_l, rect.corner_top_r);
        }
        // remove duplicates
        return Array.from(new Set(corners.map((corner) => JSON.stringify(corner)))).map((str) => JSON.parse(str));
    }
    isSuccessful() {
        return this.unpacked_rects.length === 0;
    }
    clone() {
        const cloned = new Configuration(this.size, [...this.unpacked_rects], [...this.packed_rects], this.margin, this.noRotation);
        cloned.L = [...this.L];
        cloned.concave_corners = [...this.concave_corners];
        return cloned;
    }
}
Configuration.eps = 0.001; //The amount to look in each direction when determining if a corner is concave

class BinPacker {
    constructor(configuration) {
        this.C = configuration;
    }
    _degree(i, C) {
        const d_mins = C.packed_rects.map((m) => i.min_distance(m));
        // Add the distances to the borders
        d_mins.push(i.bottom, i.left, C.size.h - i.top, C.size.w - i.right);
        // Remove two smallest elements, which will be 0 - the two immediate neighbours
        const minVal = Math.min(...d_mins);
        const index = d_mins.indexOf(minVal);
        if (index > -1) {
            d_mins.splice(index, 1);
        }
        const nextMinVal = Math.min(...d_mins);
        const nextIndex = d_mins.indexOf(nextMinVal);
        if (nextIndex > -1) {
            d_mins.splice(nextIndex, 1);
        }
        return 1 - Math.min(...d_mins) / ((i.width + i.height) / 2);
    }
    _A0(C) {
        while (C.L.length) {
            const degrees = C.L.map((ccoa) => this._degree(ccoa, C));
            const best = argmax(degrees);
            C.placeRect(C.L[best]);
        }
        return C;
    }
    _BenefitA1(ccoa, Cx) {
        Cx.placeRect(ccoa);
        Cx = this._A0(Cx);
        if (Cx.isSuccessful()) {
            return Cx;
        }
        else {
            return Cx.density();
        }
    }
    PackConfiguration(C) {
        console.log("Starting packing");
        while (C.L.length) {
            let max_benefit = 0;
            let max_benefit_ccoa = null;
            for (const ccoa of C.L) {
                // console.log(`Trying ${ccoa}`);
                const d = this._BenefitA1(ccoa, C.clone());
                if (d instanceof Configuration) {
                    console.log("Found successful configuration");
                    return d;
                }
                else {
                    if (max_benefit < d) {
                        max_benefit = d;
                        max_benefit_ccoa = ccoa;
                    }
                }
            }
            console.log(`Placed ${max_benefit_ccoa}, ${C.unpacked_rects.length} rects remaining`);
            C.placeRect(max_benefit_ccoa);
        }
        if (C.isSuccessful()) {
            console.log("Found successful configuration");
        }
        else {
            console.log("Stopped with failure");
            console.log(`Rects remaining: `);
            for (const rect of C.unpacked_rects) {
                console.log(rect);
            }
        }
        return C;
    }
}

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const pack = (rects, container_size, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    // Set default values for options
    const { padding = 0, margin = { top: 0, right: 0, bottom: 0, left: 0 }, noRotation = false, } = options;
    return new Promise((resolve) => {
        setTimeout(() => {
            if (checkIfRectanglesExceedContainer(rects, container_size, margin)) {
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
            const C = new Configuration(container_size, [...rects], // Using spread operator to create a shallow copy
            [], margin, noRotation);
            const packer = new BinPacker(C);
            const packedConfig = packer.PackConfiguration(C);
            resolve(getResult(packedConfig, padding));
        }, 0); // setTimeout with 0ms delay to make it asynchronous
    });
});

exports.pack = pack;
