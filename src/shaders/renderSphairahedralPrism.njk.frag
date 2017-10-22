#version 300 es
precision mediump float;

{% include "./struct.njk.frag" %}
{% include "./uniforms.njk.frag" %}
{% include "./raytrace.njk.frag" %}

const vec3 AMBIENT_FACTOR = vec3(0.1);
const vec3 LIGHT_DIR = normalize(vec3(1, 1, 0));

vec4 computeColor(const vec3 rayOrg, const vec3 rayDir) {
    IsectInfo isectInfo = NewIsectInfo();
    vec3 rayPos = rayOrg;
    vec3 l = vec3(0);
    float alpha = 1.;

    float transparency = 0.8;
    float coeff = 1.;

    Sphere s1;
    s1.center = vec3(0);
    s1.r.x = 0.8;
    Sphere s2;
    s2.center = vec3(1, 0, 0);
    s2.r.x = 0.1;
    IntersectSphere(0, 0, -1,
                    vec3(0.3, 1., 1.), s1,
                    rayOrg, rayDir, isectInfo);
    IntersectSphere(0, 0, -1,
                    vec3(1.0, 0., 0.), s2,
                    rayOrg, rayDir, isectInfo);

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
        } else {
            l += (diffuse + ambient) * coeff;
        }
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
