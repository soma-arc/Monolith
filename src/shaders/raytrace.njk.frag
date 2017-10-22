const float INTERSECT_THRESHOLD = 0.0001;

void GeneratePerspectiveRay(vec2 coord, mat4 projectMatrix,
                            mat4 cameraToWorld,
                            out vec3 rayOrg, out vec3 rayDir) {
    vec3 pCamera = (projectMatrix * vec4(coord, 0, 1)).xyz;
    rayOrg = (cameraToWorld * vec4(0, 0, 0, 1)).xyz;
    rayDir = (cameraToWorld * (vec4(normalize(pCamera), 0))).xyz;
}

void IntersectSphere(const int objId, const int objIndex, const int objComponentId,
                     const vec3 matColor,
                     const Sphere sphere,
                     const vec3 rayOrigin, const vec3 rayDir, inout IsectInfo isectInfo){
    vec3 v = rayOrigin - sphere.center;
    float b = dot(rayDir, v);
    float c = dot(v, v) - sphere.r.x * sphere.r.x;
    float d = b * b - c;
    if(d >= 0.){
        float s = sqrt(d);
        float t = -b - s;
        if(t <= INTERSECT_THRESHOLD) t = -b + s;
        if(INTERSECT_THRESHOLD < t && t < isectInfo.tmin){
            isectInfo.objId = objId;
            isectInfo.objIndex = objIndex;
            isectInfo.objComponentId = objComponentId;
            isectInfo.matColor = matColor;
            isectInfo.tmin = t;
            isectInfo.intersection = (rayOrigin + t * rayDir);
            isectInfo.normal = normalize(isectInfo.intersection - sphere.center);
            isectInfo.hit = true;
        }
    }
}

vec4 DistUnion(vec4 t1, vec4 t2) {
    return (t1.x < t2.x) ? t1 : t2;
}

float DistPlane(const vec3 pos, const vec3 p, const vec3 normal) {
    return dot(pos - p, normal);
}

float DistSphere(const vec3 pos, const Sphere sphere) {
    return distance(pos, sphere.center) - sphere.r.x;
}

