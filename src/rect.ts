import { PointType } from "./util";

export interface Point {
    x: number;
    y: number;
}

export default class Rect {
    id: string;
    origin: Point;
    width: number;
    height: number;
    rotated: boolean;
    bottom: number;
    top: number;
    left: number;
    right: number;
    corner_bot_l: Point;
    corner_top_l: Point;
    corner_top_r: Point;
    corner_bot_r: Point;

    constructor(
        id: string,
        origin: Point,
        width: number,
        height: number,
        origin_type: PointType = PointType.BOTTOM_LEFT,
        rotated: boolean = false
    ) {
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

    get area(): number {
        return this.width * this.height;
    }

    contains(point: Point): boolean {
        return (
            this.corner_bot_l.x <= point.x &&
            this.corner_bot_l.y <= point.y &&
            point.x <= this.corner_top_r.x &&
            point.y <= this.corner_top_r.y
        );
    }

    min_distance(other: Rect): number {
        const outer_left = Math.min(this.left, other.left);
        const outer_right = Math.max(this.right, other.right);
        const outer_bottom = Math.min(this.bottom, other.bottom);
        const outer_top = Math.max(this.top, other.top);

        const outer_width = outer_right - outer_left;
        const outer_height = outer_top - outer_bottom;

        const inner_width = Math.max(0, outer_width - this.width - other.width);
        const inner_height = Math.max(
            0,
            outer_height - this.height - other.height
        );

        return Math.sqrt(inner_width ** 2 + inner_height ** 2);
    }

    overlaps(other: Rect): boolean {
        if (this.right <= other.left || other.right <= this.left) {
            return false;
        }
        if (this.top <= other.bottom || other.top <= this.bottom) {
            return false;
        }
        return true;
    }

    *[Symbol.iterator]() {
        yield this.corner_bot_l;
        yield this.corner_top_l;
        yield this.corner_top_r;
        yield this.corner_bot_r;
    }

    toString(): string {
        return `R = ((${this.origin.x}, ${this.origin.y}), w=${this.width}, h=${this.height}, r=${this.rotated})`;
    }
}
