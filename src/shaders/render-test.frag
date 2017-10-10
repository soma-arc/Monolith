#version 300 es
precision mediump float;

uniform sampler2D u_accTexture;
uniform float u_textureWeight;
uniform float u_numSamples;
uniform vec2 u_resolution;
uniform mat4 u_projectMatrix;
uniform mat4 u_cameraToWorld;

in vec2 v_texCoord;

const float DISPLAY_GAMMA_COEFF = 1. / 2.2;
vec4 gammaCorrect(vec4 rgba) {
    return vec4((min(pow(rgba.r, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.g, DISPLAY_GAMMA_COEFF), 1.)),
                (min(pow(rgba.b, DISPLAY_GAMMA_COEFF), 1.)),
                rgba.a);
}

struct IsectInfo {
    int objId;
    int objIndex;
    int objComponentId;
    vec3 normal;
    vec3 intersection;
    float mint;
    float maxt;
    vec3 matColor;
    bool hit;
};

float MAX_FLOAT = 1e20;
const float THRESHOLD = 0.001;

IsectInfo NewIsectInfo() {
    IsectInfo isectInfo;
    isectInfo.objId = -1;
    isectInfo.objIndex = -1;
    isectInfo.objComponentId = -1;
    isectInfo.mint = MAX_FLOAT;
    isectInfo.maxt = 9999999.;
    isectInfo.hit = false;
    return isectInfo;
}

void IntersectSphere(const int objId, const int objIndex, const int objComponentId,
                     const vec3 matColor,
                     const vec3 sphereCenter, const float radius,
                     const vec3 rayOrigin, const vec3 rayDir, inout IsectInfo isectInfo){
    vec3 v = rayOrigin - sphereCenter;
    float b = dot(rayDir, v);
    float c = dot(v, v) - radius * radius;
    float d = b * b - c;
    if(d >= 0.){
        float s = sqrt(d);
        float t = -b - s;
        if(t <= THRESHOLD) t = -b + s;
        if(THRESHOLD < t && t < isectInfo.mint){
            isectInfo.objId = objId;
            isectInfo.objIndex = objIndex;
            isectInfo.objComponentId = objComponentId;
            isectInfo.matColor = matColor;
            isectInfo.mint = t;
            isectInfo.intersection = (rayOrigin + t * rayDir);
            isectInfo.normal = normalize(isectInfo.intersection - sphereCenter);
            isectInfo.hit = true;
        }
    }
}

void IntersectPlane(const int objId, const int objIndex, const int objComponentId,
					const vec3 matColor,
					const vec3 normal, const vec3 p,
					const vec3 rayOrigin, const vec3 rayDir, inout IsectInfo isectInfo) {
	float v = dot(normal, rayDir);
    float t = -(dot(normal, rayOrigin)) / v;
    if(THRESHOLD < t && t < isectInfo.mint){
        vec3 p = rayOrigin + t * rayDir;
		isectInfo.objId = objId;
		isectInfo.objIndex = objIndex;
		isectInfo.objComponentId = objComponentId;
		isectInfo.matColor = matColor;
		isectInfo.mint = t;
		isectInfo.intersection = p;
		isectInfo.normal = normal;
		isectInfo.hit = true;
    }
}

const vec3 AMBIENT_FACTOR = vec3(0.1);
const vec3 LIGHT_DIR = normalize(vec3(1, 1, 0));
vec3 computeColor(vec3 rayOrg, vec3 rayDir) {
    IsectInfo isectInfo = NewIsectInfo();
    vec3 rayPos = rayOrg;

    vec3 l = vec3(0);

    float transparency = 0.8;
    float coeff = 1.;
    for(int depth = 0 ; depth < 8; depth++){
		IntersectSphere(0, 0, -1,
						vec3(0.3, 1., 1.), vec3(0),
					    .8,
						rayPos, rayDir, isectInfo);
        IntersectSphere(0, 0, -1,
						vec3(1.0, 0., 0.), vec3(1, 0, 0),
					    .1,
						rayPos, rayDir, isectInfo);
        IntersectSphere(0, 0, -1,
						vec3(0.0, 1.0, 0.), vec3(0, 1, 0),
					    .1,
						rayPos, rayDir, isectInfo);
        IntersectSphere(0, 0, -1,
						vec3(0.0, 0.0, 1.), vec3(0, 0, 1),
					    .1,
						rayPos, rayDir, isectInfo);
		// IntersectPlane(0, 0, -1,
		// 			   vec3(1, 0, 0),
		// 			   vec3(0, 1, 0), vec3(0),
		// 			   rayPos, rayDir, isectInfo);
        if(isectInfo.hit) {
            vec3 matColor = isectInfo.matColor;
            vec3 diffuse =  clamp(dot(isectInfo.normal, LIGHT_DIR), 0., 1.) * matColor;
            vec3 ambient = matColor * AMBIENT_FACTOR;
            bool transparent = false;
            transparent = false;

            if(transparent) {
                coeff *= transparency;
                l += (diffuse + ambient) * coeff;
                rayPos = isectInfo.intersection + rayDir * 0.000001 * 2.;
                isectInfo = NewIsectInfo();
                continue;
            } else {
                l += (diffuse + ambient) * coeff;
            }
        }
        break;
    }

    return l;
}


const vec3 c_pos = vec3(2, 2, 2);
const vec3 c_target = vec3(0);
const vec3 c_up = vec3(0, 1, 0);
const float c_fov = (3.14 / 3.);
const vec2 c_res = vec2(512, 512);

vec3 calcRay (const vec3 eye, const vec3 target, const vec3 up, const float fov,
              const vec2 resolution, const vec2 coord) {
    float imagePlane = (resolution.y * .5) / tan(fov * .5);
    vec3 v = normalize(target - eye);
    vec3 xaxis = normalize(cross(v, up));
    vec3 yaxis =  normalize(cross(v, xaxis));
    vec3 center = v * imagePlane;
    vec3 origin = center - (xaxis * (resolution.x  *.5)) - (yaxis * (resolution.y * .5));
    return normalize(origin + (xaxis * coord.x) + (yaxis * (resolution.y - coord.y)));
}


void generatePerspectiveRay(vec2 coord,
                            out vec3 rayOrg, out vec3 rayDir) {
    vec3 pCamera = (u_projectMatrix * vec4(coord, 0, 1)).xyz;
    rayOrg = (u_cameraToWorld * vec4(0, 0, 0, 1)).xyz;
    rayDir = (u_cameraToWorld * (vec4(normalize(pCamera), 0))).xyz;
}

out vec4 outColor;
void main() {
    vec3 rayOrg = vec3(0);
    vec3 rayDir = vec3(0);
    float aspect = u_resolution.x / u_resolution.y;
    vec2 coord = (aspect > 1.0) ?
        (gl_FragCoord.xy / u_resolution.xy) * vec2(2. * aspect, 2.) - vec2(aspect, 1):
        (gl_FragCoord.xy / u_resolution.xy) * vec2(2., 2. / aspect) - vec2(1, 1. / aspect);

    generatePerspectiveRay(coord, rayOrg, rayDir);
    vec4 texCol = texture(u_accTexture, gl_FragCoord.xy / u_resolution);
	outColor = vec4(mix(vec4(computeColor(rayOrg, rayDir), 1), texCol, u_textureWeight));
}
