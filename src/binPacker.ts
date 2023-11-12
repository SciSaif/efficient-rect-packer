import Configuration from "./configuration";
import Rect from "./rect";
import { argmax } from "./util";

class BinPacker {
    C: Configuration;

    constructor(configuration: Configuration) {
        this.C = configuration;
    }

    private _degree(i: Rect, C: Configuration): number {
        const d_mins: number[] = C.packed_rects.map((m) => i.min_distance(m));

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

    private _A0(C: Configuration): Configuration {
        while (C.L.length) {
            const degrees: number[] = C.L.map((ccoa) => this._degree(ccoa, C));
            const best = argmax(degrees);
            C.placeRect(C.L[best]);
        }
        return C;
    }

    private _BenefitA1(ccoa: Rect, Cx: Configuration): Configuration | number {
        Cx.placeRect(ccoa);
        Cx = this._A0(Cx);

        if (Cx.isSuccessful()) {
            return Cx;
        } else {
            return Cx.density();
        }
    }

    public PackConfiguration(C: Configuration): Configuration {
        console.log("Starting packing");
        while (C.L.length) {
            let max_benefit = 0;
            let max_benefit_ccoa: Rect | null = null;

            for (const ccoa of C.L) {
                // console.log(`Trying ${ccoa}`);
                const d = this._BenefitA1(ccoa, C.clone());
                if (d instanceof Configuration) {
                    console.log("Found successful configuration");
                    return d;
                } else {
                    if (max_benefit < d) {
                        max_benefit = d;
                        max_benefit_ccoa = ccoa;
                    }
                }
            }
            // console.log(
            //     `Placed ${max_benefit_ccoa}, ${C.unpacked_rects.length} rects remaining`
            // );
            C.placeRect(max_benefit_ccoa!);
        }

        if (C.isSuccessful()) {
            // console.log("Found successful configuration");
        } else {
            // console.log("Stopped with failure");
            // console.log(`Rects remaining: `);
            // for (const rect of C.unpacked_rects) {
            //     console.log(rect);
            // }
        }
        return C;
    }
}

export { BinPacker };
