#version 300 es
precision mediump float;

{% include "./struct.njk.frag" %}
{% include "./color.njk.frag" %}
{% include "./uniforms.njk.frag" %}
{% include "./raytrace.njk.frag" %}

const int ID_PRISM = 0;
const int ID_GEN_SPHERE = 1;
const int ID_LIMIT_SET = 2;

vec4 distFunc(const vec3 pos) {
    vec4 d = vec4(MAX_FLOAT, -1, -1, -1);
    d = DistUnion(d,
                  vec4(DistLimiSet(pos), ID_LIMIT_SET, -1, -1));
    return d;
}

const vec2 NORMAL_COEFF = vec2(0.0001, 0.);
vec3 computeNormal(const vec3 p) {
    return normalize(vec3(distFunc(p + NORMAL_COEFF.xyy).x - distFunc(p - NORMAL_COEFF.xyy).x,
                          distFunc(p + NORMAL_COEFF.yxy).x - distFunc(p - NORMAL_COEFF.yxy).x,
                          distFunc(p + NORMAL_COEFF.yyx).x - distFunc(p - NORMAL_COEFF.yyx).x));
}

const vec3 AMBIENT_FACTOR = vec3(0.1);
const vec3 LIGHT_DIR = normalize(vec3(1, 1, 0));

const int MAX_MARCHING_LOOP = 3000;
const float MARCHING_THRESHOLD = 0.00001;
void march(const vec3 rayOrg, const vec3 rayDir,
           inout IsectInfo isectInfo) {
    float rayLength = 0.;
    vec3 rayPos = rayOrg + rayDir * rayLength;
    vec4 dist = vec4(-1);
    for(int i = 0 ; i < MAX_MARCHING_LOOP ; i++) {
        if(rayLength > isectInfo.tmax) break;
        dist = distFunc(rayPos);
        rayLength += dist.x;
        rayPos = rayOrg + rayDir * rayLength;
        if(dist.x < MARCHING_THRESHOLD) {
            isectInfo.objId = int(dist.y);
            //isectInfo.objIndex = int(dist.z);
            //isectInfo.objComponentId = int(dist.w);
            isectInfo.matColor = Hsv2rgb((1., -0.13 + (G_IISInvNum) * 0.01), 1., 1.);
            isectInfo.intersection = rayPos;
            isectInfo.normal = computeNormal(rayPos);
            isectInfo.tmin = rayLength;
            isectInfo.hit = true;
            break;
        }
    }
}

// This function is based on FractalLab's implementation
// http://hirnsohle.de/test/fractalLab/
float ambientOcclusion(vec3 p, vec3 n, float eps, float aoIntensity ){
    float o = 1.0;
    float k = aoIntensity;
    float d = 2.0 * eps;

    for (int i = 0; i < 5; i++) {
        o -= (d - distFunc(p + n * d).x) * k;
        d += eps;
        k *= 0.5;
    }

    return clamp(o, 0.0, 1.0);
}

float computeShadowFactor (const vec3 rayOrg, const vec3 rayDir,
                           const float mint, const float maxt, const float k) {
    float shadowFactor = 1.0;
    for(float t = mint ; t < maxt ;){
        float d = distFunc(rayOrg + rayDir * t).x;
        if(d < MARCHING_THRESHOLD) {
            shadowFactor = 0.;
            break;
        }

        shadowFactor = min(shadowFactor, k * d / t);
        t += d;
    }
    return clamp(shadowFactor, 0.0, 1.0);
}

vec4 computeColor(const vec3 rayOrg, const vec3 rayDir) {
    IsectInfo isectInfo = NewIsectInfo();
    vec3 rayPos = rayOrg;
    vec3 l = vec3(0);
    float alpha = 1.;

    float transparency = 0.8;
    float coeff = 1.;

    for(int depth = 0 ; depth < 8; depth++){
        march(rayPos, rayDir, isectInfo);

        // {% for n in range(0, numGenSpheres) %}
        // IntersectSphere(ID_GEN_SPHERE, {{ n }}, -1,
        //                 Hsv2rgb(float({{ n }}) * 0.3, 1., 1.),
        //                 u_genSpheres[{{ n }}],
        //                 rayPos, rayDir, isectInfo);
        // {% endfor %}
        
        if(isectInfo.hit) {
            vec3 matColor = isectInfo.matColor;
            vec3 diffuse =  clamp(dot(isectInfo.normal, LIGHT_DIR), 0., 1.) * matColor;
            vec3 ambient = matColor * AMBIENT_FACTOR;
            bool transparent = (isectInfo.objId == ID_GEN_SPHERE) ? true : false;

            if(transparent) {
                coeff *= transparency;
                l += (diffuse + ambient) * coeff;
                rayPos = isectInfo.intersection + rayDir * 0.000001 * 2.;
                isectInfo = NewIsectInfo();
                continue;
            } else {
                float k =  computeShadowFactor(isectInfo.intersection + 0.001 * isectInfo.normal,
                                                             LIGHT_DIR,
                                                             0.1, 5., 100.) ;
                l += (diffuse * k + ambient * ambientOcclusion(isectInfo.intersection,
                                                               isectInfo.normal,
                                                               0.0968, 2.0)) * coeff;
                break;
            }
        }
        break;
    }
    
    return vec4(l, alpha);
}

out vec4 outColor;
void main() {
    vec3 rayOrg = vec3(0);
    vec3 rayDir = vec3(0);
    float aspect = u_resolution.x / u_resolution.y;
    vec2 coord = (aspect > 1.0) ?
        (gl_FragCoord.xy / u_resolution.xy) * vec2(2. * aspect, 2.) - vec2(aspect, 1):
        (gl_FragCoord.xy / u_resolution.xy) * vec2(2., 2. / aspect) - vec2(1, 1. / aspect);

    GeneratePerspectiveRay(coord, u_projectMatrix, u_cameraToWorld,
                           rayOrg, rayDir);
    vec4 texCol = texture(u_accTexture, gl_FragCoord.xy / u_resolution);
	outColor = mix(computeColor(rayOrg, rayDir),
                   texCol,
                   u_textureWeight);
}
