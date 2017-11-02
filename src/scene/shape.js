import Vec3 from '../geometry/vector3.js';
import IsectInfo from './isectInfo.js';
import Ray from '../geometry/ray.js';

export default class Shape {
    /**
     * @param {Ray} ray
     * @param {IsectInfo} isectInfo
     * @param {Vec3} center
     * @param {Number} r
     * @param {Number} len
     */
    intersectZAxis(ray, isectInfo,
                   center, r, len) {
        const rayPos = ray.o.sub(center);
        const a = ray.d.x * ray.d.x + ray.d.y * ray.d.y;
        const b = 2 * (rayPos.x * ray.d.x + rayPos.y * ray.d.y);
        const c = rayPos.x * rayPos.x + rayPos.y * rayPos.y - r * r;
        const d = b * b - 4 * a * c;
        if (d >= 0) {
            const s = Math.sqrt(d);
            let t = (-b - s) / (2 * a);
            if (t <= isectInfo.THRESHOLD) t = (-b + s) / (2 * a);
            const p = rayPos.add(ray.d.scale(t));
            if (isectInfo.THRESHOLD < t && t < isectInfo.tmin &&
                0 < p.z && p.z < len) {
                isectInfo.setInfo(t, this, Shape.Z_AXIS);
            }
        }
    }

    /**
     * @param {Ray} ray
     * @param {IsectInfo} isectInfo
     * @param {Vec3} center
     * @param {Number} r
     * @param {Number} len
     */
    intersectXAxis(ray, isectInfo,
                   center, r, len) {
        const rayPos = ray.o.sub(center);
        const a = ray.d.y * ray.d.y + ray.d.z * ray.d.z;
        const b = 2 * (rayPos.y * ray.d.y + rayPos.z * ray.d.z);
        const c = rayPos.y * rayPos.y + rayPos.z * rayPos.z - r * r;
        const d = b * b - 4 * a * c;
        if (d >= 0) {
            const s = Math.sqrt(d);
            let t = (-b - s) / (2 * a);
            if (t <= isectInfo.THRESHOLD) t = (-b + s) / (2 * a);
            const p = rayPos.add(ray.d.scale(t));
            if (isectInfo.THRESHOLD < t && t < isectInfo.tmin &&
                0 < p.x && p.x < len) {
                isectInfo.setInfo(t, this, Shape.X_AXIS);
            }
        }
    }

    /**
     * @param {Ray} ray
     * @param {IsectInfo} isectInfo
     * @param {Vec3} center
     * @param {Number} r
     * @param {Number} len
     */
    intersectYAxis(ray, isectInfo,
                   center, r, len) {
        const rayPos = ray.o.sub(center);
        const a = ray.d.x * ray.d.x + ray.d.z * ray.d.z;
        const b = 2 * (rayPos.x * ray.d.x + rayPos.z * ray.d.z);
        const c = rayPos.x * rayPos.x + rayPos.z * rayPos.z - r * r;
        const d = b * b - 4 * a * c;
        if (d >= 0) {
            const s = Math.sqrt(d);
            let t = (-b - s) / (2 * a);
            if (t <= isectInfo.THRESHOLD) t = (-b + s) / (2 * a);
            const p = rayPos.add(ray.d.scale(t));
            if (isectInfo.THRESHOLD < t && t < isectInfo.tmin &&
                0 < p.y && p.y < len) {
                isectInfo.setInfo(t, this, Shape.Y_AXIS);
            }
        }
    }

    /**
     * @param {Ray} ray
     * @param {IsectInfo} isectInfo
     * @param {Vec3} center
     * @param {Number} r
     */
    intersectZCylinder(ray, isectInfo,
                       center, r) {
        const rayPos = ray.o.sub(center);
        const a = ray.d.x * ray.d.x + ray.d.y * ray.d.y;
        const b = 2 * (rayPos.x * ray.d.x + rayPos.y * ray.d.y);
        const c = rayPos.x * rayPos.x + rayPos.y * rayPos.y - r * r;
        const d = b * b - 4 * a * c;
        if (d >= 0) {
            const s = Math.sqrt(d);
            let t = (-b - s) / (2 * a);
            if (t <= isectInfo.THRESHOLD) t = (-b + s) / (2 * a);
            if (isectInfo.THRESHOLD < t && t < isectInfo.tmin) {
                isectInfo.setInfo(t, this, Shape.Z_AXIS);
            }
        }
    }

    /**
     * @param {Ray} ray
     * @param {IsectInfo} isectInfo
     * @param {Vec3} center
     * @param {Number} r
     */
    intersectXCylinder(ray, isectInfo, center, r) {
        const rayPos = ray.o.sub(center);
        const a = ray.d.y * ray.d.y + ray.d.z * ray.d.z;
        const b = 2 * (rayPos.y * ray.d.y + rayPos.z * ray.d.z);
        const c = rayPos.y * rayPos.y + rayPos.z * rayPos.z - r * r;
        const d = b * b - 4 * a * c;
        if (d >= 0) {
            const s = Math.sqrt(d);
            let t = (-b - s) / (2 * a);
            if (t <= isectInfo.THRESHOLD) t = (-b + s) / (2 * a);
            if (isectInfo.THRESHOLD < t && t < isectInfo.tmin) {
                isectInfo.setInfo(t, this, Shape.X_AXIS);
            }
        }
    }

    /**
     * @param {Ray} ray
     * @param {IsectInfo} isectInfo
     * @param {Vec3} center
     * @param {Number} r
     */
    intersectYCylinder(ray, isectInfo, center, r) {
        const rayPos = ray.o.sub(center);
        const a = ray.d.x * ray.d.x + ray.d.z * ray.d.z;
        const b = 2 * (rayPos.x * ray.d.x + rayPos.z * ray.d.z);
        const c = rayPos.x * rayPos.x + rayPos.z * rayPos.z - r * r;
        const d = b * b - 4 * a * c;
        if (d >= 0) {
            const s = Math.sqrt(d);
            let t = (-b - s) / (2 * a);
            if (t <= isectInfo.THRESHOLD) t = (-b + s) / (2 * a);
            if (isectInfo.THRESHOLD < t && t < isectInfo.tmin) {
                isectInfo.setInfo(t, this, Shape.Y_AXIS);
            }
        }
    }

    /**
     *
     * @param {Ray} ray
     * @param {IsectInfo} isectInfo
     * @param {Vec3} center
     * @param {Number} axisCylinderR
     * @param {Number} axisCyliderLen
     */
    computeIntersectionToAxis(ray, isectInfo, center,
                              axisCylinderR, axisCyliderLen) {
        this.intersectXAxis(ray, isectInfo, center, axisCylinderR, axisCyliderLen);
        this.intersectYAxis(ray, isectInfo, center, axisCylinderR, axisCyliderLen);
        this.intersectZAxis(ray, isectInfo, center, axisCylinderR, axisCyliderLen);
    }

    /**
     *
     * @returns {Vec3}
     */
    getOrigin() {
        return new Vec3(0, 0, 0);
    }

    /**
     *
     * @param {Vec3} newOrigin
     */
    setOrigin(newOrigin) {
    }

    getScale() {
    }

    /**
     *
     * @param {Number} diff
     */
    setScale(diff) {
    }

    static get X_AXIS() {
        return 99996;
    }

    static get Y_AXIS() {
        return 99997;
    }

    static get Z_AXIS() {
        return 99998;
    }
}
