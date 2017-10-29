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

float DistInfPrism(vec3 pos) {
    float d = -1.;
	{% for n in range(0, numGenPlanes) %}
	d = max(DistPlane(pos, u_genPlanes[{{ n }}].origin,
					  u_genPlanes[{{ n }}].normal),
			d);
	{% endfor %}

    {% for n in range(0, numGenSpheres) %}
	d = max(-DistSphere(pos, u_genSpheres[{{ n }}]),
			d);
	{% endfor %}

    {% for n in range(0, numDividePlanes) %}
    d = max(DistPlane(pos, u_dividePlanes[{{ n }}].origin,
					  u_dividePlanes[{{ n }}].normal),
			d);
    {% endfor %}
    return d;
}

void SphereInvert(inout vec3 pos, inout float dr,
                         const Sphere s) {
    vec3 diff = pos - s.center;
    float lenSq = dot(diff, diff);
    float k = s.r.y / lenSq;
    dr *= k; // (r * r) / lenSq
    pos = (diff * k) + s.center;
}


float G_IISInvNum = 0.;
float DistLimiSet(vec3 pos) {
    float invNum = 0.;
    float dr = 1.;
    float d = 0.;
    for(int i = 0; i< 1000; i++) {
        if(u_maxIISIterations <= i) break;
        bool inFund = true;
        {% for n in range(0, numGenSpheres) %}
		if(distance(pos, u_genSpheres[{{ n }}].center) < u_genSpheres[{{ n }}].r.x) {
            invNum++;
			SphereInvert(pos, dr, u_genSpheres[{{ n }}]);
			continue;
		}
		{% endfor %}

        {% for n in range(0, numGenPlanes) %}
		pos -= u_genPlanes[{{ n }}].origin;
		d = dot(pos, u_genPlanes[{{ n }}].normal);
		if(d > 0.) {
            invNum++;
			pos -= 2. * d * u_genPlanes[{{ n }}].normal;
			pos += u_genPlanes[{{ n }}].origin;
			continue;
		}
		pos += u_genPlanes[{{ n }}].origin;
		{% endfor %}

        if(inFund)
            break;
    }

    G_IISInvNum = invNum;
    return DistInfPrism(pos) / abs(dr) * u_fudgeFactor;
}
