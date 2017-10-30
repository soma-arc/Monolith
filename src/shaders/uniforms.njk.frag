uniform sampler2D u_accTexture;
uniform float u_textureWeight;
uniform float u_numSamples;
uniform vec2 u_resolution;
uniform mat4 u_projectMatrix;
uniform mat4 u_cameraToWorld;
uniform int u_maxIISIterations;
uniform float u_fudgeFactor;
uniform bool u_selectingObj;
uniform AxisCylinders u_axisCylinders;

{% if numGenSpheres > 0 %}
uniform Sphere u_genSpheres[{{ numGenSpheres }}];
{% endif %}
{% if numGenPlanes > 0 %}
uniform Plane u_genPlanes[{{ numGenPlanes }}];
{% endif %}
{% if numDividePlanes > 0 %}
uniform Plane u_dividePlanes[{{ numDividePlanes }}];
{% endif %}
