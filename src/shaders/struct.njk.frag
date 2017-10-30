struct Sphere {
    vec3 center;
    vec2 r;
};

struct Plane {
    vec3 origin;
    vec3 normal;
};

struct AxisCylinders {
    vec3 origin;
    float cylinderR;
    float cylinderLen;
};

struct IsectInfo {
    int objId;
    int objIndex;
    int objComponentId;
    vec3 normal;
    vec3 intersection;
    float tmin;
    float tmax;
    vec3 matColor;
    bool hit;
    vec4 data;
};

float MAX_FLOAT = 1e20;

IsectInfo NewIsectInfo() {
    IsectInfo isectInfo;
    isectInfo.objId = -1;
    isectInfo.objIndex = -1;
    isectInfo.objComponentId = -1;
    isectInfo.tmin = MAX_FLOAT;
    isectInfo.tmax = 9999999.;
    isectInfo.hit = false;
    isectInfo.data = vec4(0);
    return isectInfo;
}
