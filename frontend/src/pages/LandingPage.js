import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Building2, Users, Shield, TrendingUp, Award, Clock, FileCheck } from 'lucide-react';
import UnicornAnimation from '../components/UnicornAnimation';

const LandingPage = () => {
  const navigate = useNavigate();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Unicorn Studio animation data
  const heroAnimationData = {"history":[{"breakpoints":[],"visible":true,"aspectRatio":1,"userDownsample":1,"layerType":"effect","type":"gradient","usesPingPong":false,"speed":0.25,"trackMouse":0,"trackAxes":"xy","mouseMomentum":0,"texture":false,"animating":false,"isMask":0,"compiledFragmentShaders":["#version 300 es\nprecision highp float;in vec2 vTextureCoord;uniform vec2 uMousePos;vec3 getColor(int index) {\nswitch(index) {\ncase 0: return vec3(0, 0, 0);\ncase 1: return vec3(0, 0, 0);\ncase 2: return vec3(0, 0, 0);\ncase 3: return vec3(0, 0, 0);\ncase 4: return vec3(0, 0, 0);\ncase 5: return vec3(0, 0, 0);\ncase 6: return vec3(0, 0, 0);\ncase 7: return vec3(0, 0, 0);\ncase 8: return vec3(0, 0, 0);\ncase 9: return vec3(0, 0, 0);\ncase 10: return vec3(0, 0, 0);\ncase 11: return vec3(0, 0, 0);\ncase 12: return vec3(0, 0, 0);\ncase 13: return vec3(0, 0, 0);\ncase 14: return vec3(0, 0, 0);\ncase 15: return vec3(0, 0, 0);\ndefault: return vec3(0.0);\n}\n}const float PI = 3.14159265;vec2 rotate(vec2 coord, float angle) {\nfloat s = sin(angle);\nfloat c = cos(angle);\nreturn vec2(\ncoord.x * c - coord.y * s,\ncoord.x * s + coord.y * c\n);\n}out vec4 fragColor;vec3 getColor(vec2 uv) {return vec3(0, 0, 0);\n}void main() {vec2 uv = vTextureCoord;\nvec2 pos = vec2(0.5, 0.5) + mix(vec2(0), (uMousePos-0.5), 0.0000);\nuv -= pos;\nuv /= (0.5000*2.);\nuv = rotate(uv, (0.0000 - 0.5) * 2. * PI);\nvec4 color = vec4(getColor(uv), 1.0000);\nfragColor = color;\n}"],"compiledVertexShaders":["#version 300 es\nprecision mediump float;in vec3 aVertexPosition;\nin vec2 aTextureCoord;uniform mat4 uMVMatrix;\nuniform mat4 uPMatrix;out vec2 vTextureCoord;\nout vec3 vVertexPosition;void main() {\ngl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\nvTextureCoord = aTextureCoord;\n}"],"data":{"downSample":0.5,"depth":false,"uniforms":{},"isBackground":true},"id":"effect"},{"breakpoints":[],"visible":true,"aspectRatio":1,"userDownsample":1,"layerType":"effect","type":"noiseFill","usesPingPong":false,"speed":0.25,"trackMouse":0,"trackAxes":"xy","mouseMomentum":0,"texture":false,"animating":false,"isMask":0,"compiledFragmentShaders":["#version 300 es\nprecision highp float;\nin vec2 vTextureCoord;\nin vec3 vVertexPosition;uniform sampler2D uTexture;\nuniform float uTime;\nuniform vec2 uMousePos;\nuniform vec2 uResolution;vec3 hash33(vec3 p3) {\np3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));\np3 += dot(p3, p3.yxz + 19.19);\nreturn -1.0 + 2.0 * fract(vec3(\n(p3.x + p3.y) * p3.z,\n(p3.x + p3.z) * p3.y,\n(p3.y + p3.z) * p3.x\n));\n}float perlin_noise(vec3 p) {\nvec3 pi = floor(p);\nvec3 pf = p - pi;vec3 w = pf * pf * (3.0 - 2.0 * pf);float n000 = dot(pf - vec3(0.0, 0.0, 0.0), hash33(pi + vec3(0.0, 0.0, 0.0)));\nfloat n100 = dot(pf - vec3(1.0, 0.0, 0.0), hash33(pi + vec3(1.0, 0.0, 0.0)));\nfloat n010 = dot(pf - vec3(0.0, 1.0, 0.0), hash33(pi + vec3(0.0, 1.0, 0.0)));\nfloat n110 = dot(pf - vec3(1.0, 1.0, 0.0), hash33(pi + vec3(1.0, 1.0, 0.0)));\nfloat n001 = dot(pf - vec3(0.0, 0.0, 1.0), hash33(pi + vec3(0.0, 0.0, 1.0)));\nfloat n101 = dot(pf - vec3(1.0, 0.0, 1.0), hash33(pi + vec3(1.0, 0.0, 1.0)));\nfloat n011 = dot(pf - vec3(0.0, 1.0, 1.0), hash33(pi + vec3(0.0, 1.0, 1.0)));\nfloat n111 = dot(pf - vec3(1.0, 1.0, 1.0), hash33(pi + vec3(1.0, 1.0, 1.0)));float nx00 = mix(n000, n100, w.x);\nfloat nx01 = mix(n001, n101, w.x);\nfloat nx10 = mix(n010, n110, w.x);\nfloat nx11 = mix(n011, n111, w.x);float nxy0 = mix(nx00, nx10, w.y);\nfloat nxy1 = mix(nx01, nx11, w.y);float nxyz = mix(nxy0, nxy1, w.z);return nxyz;\n}\nuvec2 pcg2d(uvec2 v) {\nv = v * 1664525u + 1013904223u;\nv.x += v.y * v.y * 1664525u + 1013904223u;\nv.y += v.x * v.x * 1664525u + 1013904223u;\nv ^= v >> 16;\nv.x += v.y * v.y * 1664525u + 1013904223u;\nv.y += v.x * v.x * 1664525u + 1013904223u;\nreturn v;\n}float randFibo(vec2 p) {\nuvec2 v = floatBitsToUint(p);\nv = pcg2d(v);\nuint r = v.x ^ v.y;\nreturn float(r) / float(0xffffffffu);\n}out vec4 fragColor;const float PI = 3.14159265359;\nconst float TAU = 6.28318530718;vec3 anchoredPal(float t, vec3 col1, vec3 col2) {\nvec3 mid = 0.5 * (col1 + col2);\nvec3 axisAmp = 0.5 * (col2 - col1);vec3 base = mid + axisAmp * cos(TAU * t);vec3 axis = length(axisAmp) > 0.0001 ? normalize(axisAmp) : vec3(1.0, 0.0, 0.0);\nvec3 ref = abs(axis.x) > 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);\nvec3 tangent1 = normalize(cross(axis, ref));\nvec3 tangent2 = normalize(cross(axis, tangent1));float richness = 0.24 * length(axisAmp) + 0.02;\nvec3 ripple =\ntangent1 * sin(TAU * (t * 2.0 + 0.123)) +\ntangent2 * sin(TAU * (t * 3.0 + 0.437));vec3 col = base + (richness * 0.5000) * ripple;\ncol = 1./(1. + exp(-col * 4. + 0.25) * 7.5);\nreturn col;\n}mat2 rot(float a) {\nreturn mat2(cos(a),-sin(a),sin(a),cos(a));\n}float getPerlinNoise(vec2 uv) {\nfloat turb = 0.2700 * 3.2;\nvec2 skew = vec2(0.5000, 1. - 0.5000);\nvec2 drift = vec2(0, 0.0000 * uTime * 0.0125) * mix(1., 14., 0.2300);\nfloat noise = perlin_noise(vec3(\nuv * skew - drift,\n0.0000 + uTime * 0.03\n));return mix(0.5, noise * 0.5 + 0.5, turb);\n}float getNoise(vec2 uv) {\nreturn getPerlinNoise(uv);\n}void main() {\nvec2 uv = vTextureCoord;\nfloat aspectRatio = uResolution.x/uResolution.y;\nvec2 aspect = vec2(aspectRatio, 1.0);vec2 mPos = vec2(0.7029616724738676, 0.03170731707317065) + mix(vec2(0), (uMousePos-0.5), 0.0000);vec2 pos = mix(vec2(0.7029616724738676, 0.03170731707317065), mPos, 0.0000);\nfloat scale = mix(1., 14., 0.2300);\nvec2 drift = vec2(0, 0.0000 * uTime * 0.0125);\nmat2 rotation = rot(0.0000 * 2. * PI);vec2 st = (uv - pos) * aspect * scale * rotation;\nfloat noise = getNoise(st);if (0.0000 > 0.0) {\nvec2 toMouse = (uv - uMousePos) * aspect;\nfloat r = length(toMouse);\nfloat radius = mix(0.1, 1., 0.5000);\nfloat falloff = 1.0 - smoothstep(0.0, radius, r);\nvec2 dir = toMouse / max(r, 1e-5);\nvec2 uvBulgeOffsetAspect = -dir * (0.0000 * radius) * falloff * falloff;\nvec2 offset = uvBulgeOffsetAspect / aspect * r * 5.;\nst = (uv - pos + offset * noise) * aspect * scale * rotation;\nnoise = getNoise(st);\n}vec4 color = texture(uTexture, uv);\nvec4 bg = color;\nfloat shift = 0.0000 + (0.0000 * uTime * 0.01);\nvec3 noiseColor = anchoredPal(noise + shift, vec3(0.396078431372549, 0.4392156862745098, 0.9882352941176471), vec3(0.6705882352941176, 0.8941176470588236, 1));\ncolor.rgb = noiseColor.rgb;float dither = (randFibo(gl_FragCoord.xy) - 0.5) / 255.0;\ncolor.rgb += dither * 0.5;color.rgb = mix(bg.rgb, color.rgb, 1.0000);\ncolor.a = max(bg.a, 1.0000);\nfragColor = color;}"],"compiledVertexShaders":["#version 300 es\nprecision mediump float;in vec3 aVertexPosition;\nin vec2 aTextureCoord;uniform mat4 uMVMatrix;\nuniform mat4 uPMatrix;\nuniform mat4 uTextureMatrix;out vec2 vTextureCoord;\nout vec3 vVertexPosition;void main() {\ngl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\nvTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;\n}"],"data":{"depth":false,"uniforms":{},"isBackground":false},"id":"effect1"},{"breakpoints":[],"visible":true,"locked":false,"aspectRatio":3.937649880095923,"layerName":"","userDownsample":1,"isElement":true,"opacity":1,"effects":[],"displace":0,"trackMouse":0,"anchorPoint":"topCenter","mouseMomentum":0,"blendMode":"NORMAL","bgDisplace":0,"mask":0,"maskBackground":{"type":"Vec3","_x":0,"_y":0,"_z":0},"maskAlpha":0,"maskDepth":0,"maskDepthLayer":1,"dispersion":0,"axisTilt":0,"states":{"appear":[],"scroll":[],"hover":[]},"layerType":"shape","width":1.43,"widthMode":"relative","height":0.5810572472594396,"heightMode":"auto","left":0.5,"leftMode":"relative","top":0.7711111111111112,"topMode":"relative","rotation":0,"trackAxes":"xy","borderRadius":0,"gradientAngle":0,"strokeWidth":6,"coords":[[0,0],[1.43,0],[1.43,0.5810572472594396],[0,0.5810572472594396]],"fill":["#000000"],"fitToCanvas":false,"gradientType":"linear","type":"circle","stroke":["#FFFFFF"],"numSides":3,"compiledFragmentShaders":["#version 300 es\nprecision highp float;\nin vec2 vTextureCoord;\nin vec3 vVertexPosition;uniform vec2 uMousePos;\nuniform sampler2D uBgTexture;\nuniform sampler2D uTexture;\nuniform int uSampleBg;const float STEPS = 24.0;\nconst float PI = 3.1415926;out vec4 fragColor;vec4 getNormalOutput(vec4 color, vec4 background) {\ncolor = mix(background, color + background * (1.0 - color.a), 1.0000);\nreturn color;\n}vec4 getOutputByMode(vec4 color, vec4 background) {\nreturn getNormalOutput(color, background);\n}void main() {\nvec2 uv = vTextureCoord;\nvec2 pos = mix(vec2(0), (uMousePos - 0.5), 0.0000);uv -= pos;vec4 background = vec4(0);\nif(uSampleBg == 1) {\nbackground = texture(uBgTexture, vTextureCoord);\n}\nvec4 color = texture(uTexture, uv);vec4 col = getOutputByMode(color, background);fragColor = col;\n}"],"compiledVertexShaders":["#version 300 es\nprecision highp float;in vec3 aVertexPosition;\nin vec2 aTextureCoord;uniform mat4 uMVMatrix;\nuniform mat4 uPMatrix;\nuniform mat4 uTextureMatrix;\nuniform vec2 uMousePos;out vec2 vTextureCoord;\nout vec3 vVertexPosition;void main() {\nfloat angleX = uMousePos.y * 0.5 - 0.25;\nfloat angleY = (1.-uMousePos.x) * 0.5 - 0.25;mat4 rotateX = mat4(1.0, 0.0, 0.0, 0.0,\n0.0, cos(angleX), -sin(angleX), 0.0,\n0.0, sin(angleX), cos(angleX), 0.0,\n0.0, 0.0, 0.0, 1.0);\nmat4 rotateY = mat4(cos(angleY), 0.0, sin(angleY), 0.0,\n0.0, 1.0, 0.0, 0.0,\n-sin(angleY), 0.0, cos(angleY), 0.0,\n0.0, 0.0, 0.0, 1.0);mat4 rotationMatrix = rotateX * rotateY;\ngl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\nvVertexPosition = (rotationMatrix * vec4(aVertexPosition, 1.0)).xyz;\nvTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;\n}"],"data":{"uniforms":{}},"id":"shape"},{"breakpoints":[],"visible":true,"aspectRatio":1,"userDownsample":1,"layerType":"effect","type":"vignette","usesPingPong":false,"trackMouse":0,"trackAxes":"xy","mouseMomentum":0,"texture":false,"animating":false,"isMask":0,"compiledFragmentShaders":["#version 300 es\nprecision highp float;\nin vec3 vVertexPosition;\nin vec2 vTextureCoord;\nuniform sampler2D uTexture;\nuniform vec2 uResolution;out vec4 fragColor;\nmat2 rot(float a) {\nreturn mat2(cos(a),-sin(a),sin(a),cos(a));\n}\nvoid main() {\nvec2 uv = vTextureCoord;\nvec4 bg = texture(uTexture, uv);\nfloat luma = dot(bg.rgb, vec3(0.299, 0.587, 0.114));\nfloat displacement = (luma - 0.5) * 0.0000 * 0.5;\nvec2 aspectRatio = vec2(uResolution.x/uResolution.y, 1.0);\nvec2 skew = vec2(0.5000, 1.0 - 0.5000);\nfloat halfRadius = 0.4160 * 0.5;\nfloat innerEdge = halfRadius - 2.8600 * halfRadius * 0.5;\nfloat outerEdge = halfRadius + 2.8600 * halfRadius * 0.5;\nvec2 pos = vec2(0.5121951219512195, 0.0916376306620208);\nconst float TWO_PI = 6.28318530718;\nvec2 scaledUV = uv * aspectRatio * rot(0.0108 * TWO_PI) * skew;\nvec2 scaledPos = pos * aspectRatio * rot(0.0108 * TWO_PI) * skew;\nfloat radius = distance(scaledUV, scaledPos);\nfloat falloff = smoothstep(innerEdge + displacement, outerEdge + displacement, radius);\nvec3 finalColor;finalColor = mix(bg.rgb, mix(bg.rgb, vec3(0, 0, 0), 1.0000), falloff);float alpha = max(bg.a, falloff * 1.0000);\nvec4 color = mix(bg * (1.-falloff), vec4(finalColor * alpha, alpha), 1.0000);\nfragColor = color;}"],"compiledVertexShaders":["#version 300 es\nprecision mediump float;in vec3 aVertexPosition;\nin vec2 aTextureCoord;uniform mat4 uMVMatrix;\nuniform mat4 uPMatrix;\nuniform mat4 uTextureMatrix;out vec2 vTextureCoord;\nout vec3 vVertexPosition;void main() {\ngl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\nvTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;\n}"],"data":{"depth":false,"uniforms":{},"isBackground":false},"id":"effect2"},{"breakpoints":[],"visible":true,"aspectRatio":1,"userDownsample":1,"layerType":"effect","type":"wisps","usesPingPong":false,"speed":0.05,"trackMouse":0,"trackAxes":"xy","mouseMomentum":0,"texture":false,"animating":true,"isMask":0,"compiledFragmentShaders":["#version 300 es\nprecision highp float;in vec3 vVertexPosition;\nin vec2 vTextureCoord;\nuniform sampler2D uTexture;\nuniform float uTime;\nuniform vec2 uMousePos;\nuniform vec2 uResolution;\nvec3 blend (int blendMode, vec3 src, vec3 dst) {\nreturn src + dst;\n}out vec4 fragColor;\nconst float PI = 3.14159265359;\nmat2 rot(float a) {\nreturn mat2(cos(a), -sin(a), sin(a), cos(a));\n}vec2 hash(vec2 p) {\np = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));\nreturn -1.0 + 2.0 * fract(sin(p) * 43758.5453123);\n}float luma(vec3 color) {\nreturn dot(color, vec3(0.299, 0.587, 0.114));\n}float voronoi_additive(vec2 st, float radius, vec2 mouse_pos, float scale) {\nvec2 i_st = floor(st);\nvec2 f_st = fract(st);float wander = 0.4500 * uTime * 0.2;\nfloat total_contribution = 0.0;for (int y = -2; y <= 2; y++) {\nfor (int x = -2; x <= 2; x++) {\nvec2 neighbor = vec2(float(x), float(y));\nvec2 cell_id = i_st + neighbor;\nvec2 point = hash(cell_id);\npoint = 0.5 + 0.5 * sin(5. + wander + 6.2831 * point);\nvec2 starAbsPos = cell_id + point;\nvec2 dirToMouse = mouse_pos - starAbsPos;\nfloat distToMouse = length(dirToMouse);\nfloat attractStrength = 0.0000 * exp(-distToMouse * mix(2.0 + 0.1300 * 2., 0.5, 0.5000)) * 2.;\nstarAbsPos += dirToMouse * attractStrength;\nvec2 diff = starAbsPos - st;\nfloat dist = length(diff);float contribution = radius / max(dist, radius * 0.1);\nfloat shimmer_phase = dot(point, vec2(1.0)) * 10. + hash(cell_id).x * 5.0 + uTime * 0.5;\nfloat shimmer = mix(1., (sin(shimmer_phase) + 1.), 0.5000);\ncontribution *= shimmer;\ntotal_contribution += mix(contribution*contribution, contribution * 2., 0.2500);\n}\n}return total_contribution;\n}vec4 randomStyle() {\nvec2 uv = vTextureCoord;vec4 bg = texture(uTexture, uv);vec4 color = vec4(0.0);\nvec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);vec2 mPos = mix(vec2(0.0), (uMousePos - 0.5), 0.0000);uv -= vec2(0.5, 0.5);\nuv *= aspectRatio;\nuv = uv * rot(0.0000 * 2.0 * PI);\nuv *= 40.0 * 0.1300;\nuv *= mix(vec2(1.0), vec2(1.0, 0.0), 0.0000);\nuv /= aspectRatio;mPos = mPos * rot(0.0000 * 2.0 * PI);vec2 mouseGrid = uMousePos;\nmouseGrid -= vec2(0.5, 0.5);\nmouseGrid *= aspectRatio;\nmouseGrid = mouseGrid * rot(0.0000 * 2.0 * PI);\nmouseGrid *= 40.0 * 0.1300;\nmouseGrid *= mix(vec2(1.0), vec2(1.0, 0.0), 0.0000);\nmouseGrid /= aspectRatio;vec2 movementOffset = vec2(0.0, uTime * 0.1900 * -0.05);\nvec2 mouseGrid1 = mouseGrid - (mPos * 38.0 * 0.1300) + movementOffset;\nvec2 mouseGrid2 = mouseGrid - (mPos * 48.0 * 0.1300) + movementOffset;vec2 st1 = uv - (mPos * 38.0 * 0.1300);\nvec2 st2 = uv - (mPos * 48.0 * 0.1300);vec2 mouse1 = st1 + vec2(0.0, uTime * 0.1900 * -0.05);\nvec2 mouse2 = st2 + vec2(0.0, uTime * 0.1900 * -0.05);float radius1 = 0.5 * 0.1100;\nfloat radius2 = 0.5 * 0.1100;float pass1 = voronoi_additive(mouse1 * aspectRatio, radius1, mouseGrid1 * aspectRatio, 38.0 * 0.1300);\nfloat pass2 = voronoi_additive(mouse2 * aspectRatio + vec2(10), radius2, mouseGrid2 * aspectRatio + vec2(10.0), 48.0 * 0.1300);pass1 *= 0.02;\npass2 *= 0.04;color.rgb = (pass1 + pass2) * vec3(1, 1, 1) * mix(1.0, bg.r, 1.0000);\ncolor.rgb = clamp(color.rgb, 0.0, 1.0);color.rgb = blend(1, bg.rgb, color.rgb);color = vec4(color.rgb, max(bg.a, luma(color.rgb)));\nreturn color;\n}void main() {\nvec4 color;color = randomStyle();\nfragColor = color;}"],"compiledVertexShaders":["#version 300 es\nprecision mediump float;in vec3 aVertexPosition;\nin vec2 aTextureCoord;uniform mat4 uMVMatrix;\nuniform mat4 uPMatrix;\nuniform mat4 uTextureMatrix;out vec2 vTextureCoord;\nout vec3 vVertexPosition;void main() {\ngl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\nvTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;\n}"],"data":{"depth":false,"uniforms":{},"isBackground":false},"id":"effect3"},{"breakpoints":[],"visible":true,"aspectRatio":1,"userDownsample":1,"layerType":"effect","type":"bloom","usesPingPong":false,"texture":false,"animating":false,"mouseMomentum":0,"isMask":0,"compiledFragmentShaders":["#version 300 es\nprecision highp float;\nprecision highp int;in vec3 vVertexPosition;\nin vec2 vTextureCoord;uniform sampler2D uTexture;out vec4 fragColor;float luma(vec4 color) {\nreturn dot(color.rgb, vec3(0.299, 0.587, 0.114));\n}vec4 thresholdPass(vec4 color) {\ncolor.rgb = pow(color.rgb, vec3(1.0/2.2));\ncolor.rgb = 1.2 * (color.rgb - 0.5) + 0.5;\nvec4 bloom = color * smoothstep(0.8000 - 0.1, 0.8000, luma(color));\nreturn vec4(bloom.rgb, color.a);\n}vec4 getColor(vec4 color) {\nreturn thresholdPass(color);\n}void main() {\nvec2 uv = vTextureCoord;\nvec4 color = texture(uTexture, uv);\nfragColor = getColor(color);\n}","#version 300 es\nprecision highp float;\nprecision highp int;in vec3 vVertexPosition;\nin vec2 vTextureCoord;uniform sampler2D uTexture;uniform vec2 uResolution;out vec4 fragColor;float getExponentialWeight(int index) {\nswitch(index) {\ncase 0: return 1.0000000000;\ncase 1: return 0.7165313106;\ncase 2: return 0.5134171190;\ncase 3: return 0.3678794412;\ncase 4: return 0.2636050919;\ncase 5: return 0.1888756057;\ncase 6: return 0.1353352832;\ncase 7: return 0.0969670595;\ncase 8: return 0.0694877157;\ndefault: return 0.0;\n}\n}vec4 blur(vec2 uv, bool vertical, float radius, bool diamond) {\nvec4 color = vec4(0.0);\nfloat total_weight = 0.0;\nfloat aspectRatio = uResolution.x/uResolution.y;vec2 dir;\nif (diamond) {\ndir = vertical ? vec2(1, 1) : vec2(1, -1);\n} else {\ndir = vertical ? vec2(0, 1) : vec2(1, 0);\n}\ndir *= vec2(0.5000, 1. - 0.5000);\ndir.x /= aspectRatio;\nvec4 center = texture(uTexture, uv);\nfloat center_weight = getExponentialWeight(0);\ncolor += center * center_weight;\ntotal_weight += center_weight;radius *= 0.2000;\nfor (int i = 1; i <= 8; i++) {\nfloat weight = getExponentialWeight(i);\nfloat offset = mix(0.015, 0.025, radius) * float(i)/8.;\nvec4 sample1 = texture(uTexture, uv + offset * dir);\nvec4 sample2 = texture(uTexture, uv - offset * dir);\ncolor += (sample1 + sample2) * weight;\ntotal_weight += 2.0 * weight;\n}return color / total_weight;\n}vec4 blurPass(vec2 uv, bool vertical, float radius, float intensity, bool diamond) {\nreturn blur(uv, vertical, radius, diamond);\n}vec4 getColor(vec4 color) {\nreturn blurPass(vTextureCoord, false, 40., 1.25, true);\n}void main() {\nvec2 uv = vTextureCoord;\nvec4 color = texture(uTexture, uv);\nfragColor = getColor(color);\n}","#version 300 es\nprecision highp float;\nprecision highp int;in vec3 vVertexPosition;\nin vec2 vTextureCoord;uniform sampler2D uTexture;\nuniform sampler2D uBgTexture;uniform vec2 uResolution;out vec4 fragColor;float luma(vec4 color) {\nreturn dot(color.rgb, vec3(0.299, 0.587, 0.114));\n}float getExponentialWeight(int index) {\nswitch(index) {\ncase 0: return 1.0000000000;\ncase 1: return 0.7165313106;\ncase 2: return 0.5134171190;\ncase 3: return 0.3678794412;\ncase 4: return 0.2636050919;\ncase 5: return 0.1888756057;\ncase 6: return 0.1353352832;\ncase 7: return 0.0969670595;\ncase 8: return 0.0694877157;\ndefault: return 0.0;\n}\n}vec4 blur(vec2 uv, bool vertical, float radius, bool diamond) {\nvec4 color = vec4(0.0);\nfloat total_weight = 0.0;\nfloat aspectRatio = uResolution.x/uResolution.y;vec2 dir;\nif (diamond) {\ndir = vertical ? vec2(1, 1) : vec2(1, -1);\n} else {\ndir = vertical ? vec2(0, 1) : vec2(1, 0);\n}\ndir *= vec2(0.5000, 1. - 0.5000);\ndir.x /= aspectRatio;\nvec4 center = texture(uTexture, uv);\nfloat center_weight = getExponentialWeight(0);\ncolor += center * center_weight;\ntotal_weight += center_weight;radius *= 0.2000;\nfor (int i = 1; i <= 8; i++) {\nfloat weight = getExponentialWeight(i);\nfloat offset = mix(0.015, 0.025, radius) * float(i)/8.;\nvec4 sample1 = texture(uTexture, uv + offset * dir);\nvec4 sample2 = texture(uTexture, uv - offset * dir);\ncolor += (sample1 + sample2) * weight;\ntotal_weight += 2.0 * weight;\n}return color / total_weight;\n}vec4 thresholdPass(vec4 color) {\ncolor.rgb = pow(color.rgb, vec3(1.0/2.2));\ncolor.rgb = 1.2 * (color.rgb - 0.5) + 0.5;\nvec4 bloom = color * smoothstep(0.8000 - 0.1, 0.8000, luma(color));\nreturn vec4(bloom.rgb, color.a);\n}vec4 blurCombinePass(vec2 uv, bool vertical, float radius, float intensity, bool diamond) {\nvec4 blurred = blur(uv, vertical, radius, diamond);\nreturn (thresholdPass(texture(uBgTexture, uv)) * 0.25 + blurred * intensity);\n}vec4 getColor(vec4 color) {\nreturn blurCombinePass(vTextureCoord, true, 40., 1.25, true);\n}void main() {\nvec2 uv = vTextureCoord;\nvec4 color = texture(uTexture, uv);\nfragColor = getColor(color);\n}","#version 300 es\nprecision highp float;\nprecision highp int;in vec3 vVertexPosition;\nin vec2 vTextureCoord;uniform sampler2D uTexture;uniform vec2 uResolution;out vec4 fragColor;float getExponentialWeight(int index) {\nswitch(index) {\ncase 0: return 1.0000000000;\ncase 1: return 0.7165313106;\ncase 2: return 0.5134171190;\ncase 3: return 0.3678794412;\ncase 4: return 0.2636050919;\ncase 5: return 0.1888756057;\ncase 6: return 0.1353352832;\ncase 7: return 0.0969670595;\ncase 8: return 0.0694877157;\ndefault: return 0.0;\n}\n}vec4 blur(vec2 uv, bool vertical, float radius, bool diamond) {\nvec4 color = vec4(0.0);\nfloat total_weight = 0.0;\nfloat aspectRatio = uResolution.x/uResolution.y;vec2 dir;\nif (diamond) {\ndir = vertical ? vec2(1, 1) : vec2(1, -1);\n} else {\ndir = vertical ? vec2(0, 1) : vec2(1, 0);\n}\ndir *= vec2(0.5000, 1. - 0.5000);\ndir.x /= aspectRatio;\nvec4 center = texture(uTexture, uv);\nfloat center_weight = getExponentialWeight(0);\ncolor += center * center_weight;\ntotal_weight += center_weight;radius *= 0.2000;\nfor (int i = 1; i <= 8; i++) {\nfloat weight = getExponentialWeight(i);\nfloat offset = mix(0.015, 0.025, radius) * float(i)/8.;\nvec4 sample1 = texture(uTexture, uv + offset * dir);\nvec4 sample2 = texture(uTexture, uv - offset * dir);\ncolor += (sample1 + sample2) * weight;\ntotal_weight += 2.0 * weight;\n}return color / total_weight;\n}vec4 blurPass(vec2 uv, bool vertical, float radius, float intensity, bool diamond) {\nreturn blur(uv, vertical, radius, diamond);\n}vec4 getColor(vec4 color) {\nreturn blurPass(vTextureCoord, false, 15., 1.1, true);\n}void main() {\nvec2 uv = vTextureCoord;\nvec4 color = texture(uTexture, uv);\nfragColor = getColor(color);\n}","#version 300 es\nprecision highp float;\nprecision highp int;in vec3 vVertexPosition;\nin vec2 vTextureCoord;uniform sampler2D uTexture;\nuniform sampler2D uBgTexture;uniform vec2 uResolution;out vec4 fragColor;float luma(vec4 color) {\nreturn dot(color.rgb, vec3(0.299, 0.587, 0.114));\n}float getExponentialWeight(int index) {\nswitch(index) {\ncase 0: return 1.0000000000;\ncase 1: return 0.7165313106;\ncase 2: return 0.5134171190;\ncase 3: return 0.3678794412;\ncase 4: return 0.2636050919;\ncase 5: return 0.1888756057;\ncase 6: return 0.1353352832;\ncase 7: return 0.0969670595;\ncase 8: return 0.0694877157;\ndefault: return 0.0;\n}\n}vec4 blur(vec2 uv, bool vertical, float radius, bool diamond) {\nvec4 color = vec4(0.0);\nfloat total_weight = 0.0;\nfloat aspectRatio = uResolution.x/uResolution.y;vec2 dir;\nif (diamond) {\ndir = vertical ? vec2(1, 1) : vec2(1, -1);\n} else {\ndir = vertical ? vec2(0, 1) : vec2(1, 0);\n}\ndir *= vec2(0.5000, 1. - 0.5000);\ndir.x /= aspectRatio;\nvec4 center = texture(uTexture, uv);\nfloat center_weight = getExponentialWeight(0);\ncolor += center * center_weight;\ntotal_weight += center_weight;radius *= 0.2000;\nfor (int i = 1; i <= 8; i++) {\nfloat weight = getExponentialWeight(i);\nfloat offset = mix(0.015, 0.025, radius) * float(i)/8.;\nvec4 sample1 = texture(uTexture, uv + offset * dir);\nvec4 sample2 = texture(uTexture, uv - offset * dir);\ncolor += (sample1 + sample2) * weight;\ntotal_weight += 2.0 * weight;\n}return color / total_weight;\n}vec4 thresholdPass(vec4 color) {\ncolor.rgb = pow(color.rgb, vec3(1.0/2.2));\ncolor.rgb = 1.2 * (color.rgb - 0.5) + 0.5;\nvec4 bloom = color * smoothstep(0.8000 - 0.1, 0.8000, luma(color));\nreturn vec4(bloom.rgb, color.a);\n}vec4 blurCombinePass(vec2 uv, bool vertical, float radius, float intensity, bool diamond) {\nvec4 blurred = blur(uv, vertical, radius, diamond);\nreturn (thresholdPass(texture(uBgTexture, uv)) * 0.25 + blurred * intensity);\n}vec4 getColor(vec4 color) {\nreturn blurCombinePass(vTextureCoord, true, 15., 1.1, true);\n}void main() {\nvec2 uv = vTextureCoord;\nvec4 color = texture(uTexture, uv);\nfragColor = getColor(color);\n}","#version 300 es\nprecision highp float;\nprecision highp int;in vec3 vVertexPosition;\nin vec2 vTextureCoord;uniform sampler2D uTexture;uniform vec2 uResolution;out vec4 fragColor;float getExponentialWeight(int index) {\nswitch(index) {\ncase 0: return 1.0000000000;\ncase 1: return 0.7165313106;\ncase 2: return 0.5134171190;\ncase 3: return 0.3678794412;\ncase 4: return 0.2636050919;\ncase 5: return 0.1888756057;\ncase 6: return 0.1353352832;\ncase 7: return 0.0969670595;\ncase 8: return 0.0694877157;\ndefault: return 0.0;\n}\n}vec4 blur(vec2 uv, bool vertical, float radius, bool diamond) {\nvec4 color = vec4(0.0);\nfloat total_weight = 0.0;\nfloat aspectRatio = uResolution.x/uResolution.y;vec2 dir;\nif (diamond) {\ndir = vertical ? vec2(1, 1) : vec2(1, -1);\n} else {\ndir = vertical ? vec2(0, 1) : vec2(1, 0);\n}\ndir *= vec2(0.5000, 1. - 0.5000);\ndir.x /= aspectRatio;\nvec4 center = texture(uTexture, uv);\nfloat center_weight = getExponentialWeight(0);\ncolor += center * center_weight;\ntotal_weight += center_weight;radius *= 0.2000;\nfor (int i = 1; i <= 8; i++) {\nfloat weight = getExponentialWeight(i);\nfloat offset = mix(0.015, 0.025, radius) * float(i)/8.;\nvec4 sample1 = texture(uTexture, uv + offset * dir);\nvec4 sample2 = texture(uTexture, uv - offset * dir);\ncolor += (sample1 + sample2) * weight;\ntotal_weight += 2.0 * weight;\n}return color / total_weight;\n}vec4 blurPass(vec2 uv, bool vertical, float radius, float intensity, bool diamond) {\nreturn blur(uv, vertical, radius, diamond);\n}vec4 getColor(vec4 color) {\nreturn blurPass(vTextureCoord, false, 7.5, 1., false);\n}void main() {\nvec2 uv = vTextureCoord;\nvec4 color = texture(uTexture, uv);\nfragColor = getColor(color);\n}","#version 300 es\nprecision highp float;\nprecision highp int;in vec3 vVertexPosition;\nin vec2 vTextureCoord;uniform sampler2D uTexture;\nuniform sampler2D uBgTexture;uvec2 pcg2d(uvec2 v) {\nv = v * 1664525u + 1013904223u;\nv.x += v.y * v.y * 1664525u + 1013904223u;\nv.y += v.x * v.x * 1664525u + 1013904223u;\nv ^= v >> 16;\nv.x += v.y * v.y * 1664525u + 1013904223u;\nv.y += v.x * v.x * 1664525u + 1013904223u;\nreturn v;\n}float randFibo(vec2 p) {\nuvec2 v = floatBitsToUint(p);\nv = pcg2d(v);\nuint r = v.x ^ v.y;\nreturn float(r) / float(0xffffffffu);\n}out vec4 fragColor;float luma(vec4 color) {\nreturn dot(color.rgb, vec3(0.299, 0.587, 0.114));\n}vec4 finalPass(vec4 bloomColor) {\nfloat dither = (randFibo(gl_FragCoord.xy) - 0.5) / 255.0;\nbloomColor.rgb *= vec3(1, 1, 1);\nbloomColor.rgb += dither;\nbloomColor.a = luma(bloomColor);\nvec4 sceneColor = texture(uBgTexture, vTextureCoord);\nvec4 finalColor = mix(sceneColor, sceneColor + bloomColor, 0.6900 * 1.75);\nreturn finalColor;\n}vec4 getColor(vec4 color) {\nreturn finalPass(color);\n}void main() {\nvec2 uv = vTextureCoord;\nvec4 color = texture(uTexture, uv);\nfragColor = getColor(color);\n}"],"compiledVertexShaders":["#version 300 es\nprecision mediump float;in vec3 aVertexPosition;\nin vec2 aTextureCoord;uniform mat4 uMVMatrix;\nuniform mat4 uPMatrix;\nuniform mat4 uTextureMatrix;out vec2 vTextureCoord;\nout vec3 vVertexPosition;void main() {\ngl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\nvTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;\n}"],"data":{"downSample":0.5,"depth":false,"uniforms":{},"isBackground":false,"passes":[{"prop":"pass","value":1,"downSample":0.25},{"prop":"pass","value":2,"downSample":0.25,"includeBg":true},{"prop":"pass","value":3,"downSample":0.25},{"prop":"pass","value":4,"downSample":0.25,"includeBg":true},{"prop":"pass","value":5,"downSample":0.5},{"prop":"pass","value":6,"downSample":0.5,"includeBg":true},{"prop":"pass","value":7,"downSample":1,"includeBg":true}]},"id":"effect4"}],"options":{"name":"Alcove Hero (Remix)","fps":60,"dpi":1.5,"scale":1,"includeLogo":false,"isProduction":false},"version":"1.5.3","id":"SdgD9hLNOugLFn4ykdyR"};

  const testimonials = [
    {
      text: "DealLinked transformed how I source off-market deals. The quality control and NCND protection give me confidence every deal is legitimate.",
      author: "Sarah M.",
      role: "Commercial Real Estate Investor"
    },
    {
      text: "As a broker, the reputation system helps me stand out. My verified listings get priority visibility, and I've closed 3 deals in the first month.",
      author: "Michael R.",
      role: "Commercial Broker"
    },
    {
      text: "Finally, a marketplace that weeds out the noise. Only serious brokers with quality deals. The completeness requirements ensure I'm not wasting time.",
      author: "Jennifer L.",
      role: "Private Equity Investor"
    },
    {
      text: "The NCND digital signature system is brilliant. I feel protected sharing my off-market opportunities, and buyers appreciate the professionalism.",
      author: "David K.",
      role: "Off-Market Specialist"
    }
  ];

  return (
    <div style={{ 
      background: '#000',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Transparent Navigation Overlay */}
      <nav style={{
        padding: '20px 60px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'transparent',
        borderBottom: 'none'
      }}>
        <img 
          src="https://customer-assets.emergentagent.com/job_805e556f-4159-4595-8a8e-d3bb43ff0c72/artifacts/72aahevp_DealLinked.png"
          alt="DealLinked"
          style={{
            height: '48px',
            cursor: 'pointer',
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))'
          }}
          onClick={() => navigate('/')}
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 24px',
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section with Unicorn Studio Animation Background */}
      <section style={{
        position: 'relative',
        padding: '0',
        textAlign: 'center',
        background: '#000',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Unicorn Studio Animated Background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          opacity: 0.8
        }}>
          <UnicornAnimation 
            animationData={heroAnimationData}
            style={{
              width: '100%',
              height: '100%'
            }}
          />
        </div>
        
        {/* Content overlay - Vertically Centered */}
        <div style={{ 
          position: 'relative', 
          zIndex: 1,
          padding: '80px 60px',
          maxWidth: '100%'
        }}>
          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 72px)',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '32px',
            lineHeight: '1.1',
            letterSpacing: '-0.03em',
            fontFamily: '"Inter", sans-serif',
            textShadow: '0 2px 20px rgba(255, 255, 255, 0.1)',
            filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
          }}>
            The Private Marketplace for
            <br />
            Real Dealmakers
          </h1>
          <p style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            color: 'rgba(255,255,255,0.65)',
            marginBottom: '48px',
            maxWidth: '780px',
            margin: '0 auto 48px',
            lineHeight: '1.65',
            fontWeight: '400',
            padding: '0 20px'
          }}>
            A curated off-market exchange built for serious operators. Discover real deals,
            <br />
            engage real decision-makers, and manage everything end-to-end with the
            <br />
            industry's first fully integrated deal OS.
          </p>

          {/* Get Started Button */}
          <button
            onClick={() => navigate('/signup')}
            style={{
              padding: '16px 40px',
              background: '#3063ff',
              border: 'none',
              borderRadius: '30px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(48, 99, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Get Started
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Application Showcase Video - Full Width */}
      <section style={{
        padding: '0',
        position: 'relative',
        zIndex: 30,
        background: '#000',
        width: '100%'
      }}>
        <video 
          autoPlay
          loop
          muted
          playsInline
          style={{ 
            width: '100%',
            display: 'block',
            margin: '0',
            padding: '0'
          }}
        >
          <source src="https://customer-assets.emergentagent.com/job_unifydash/artifacts/wlnchej5_second_section%20%281%29.webm" type="video/webm" />
        </video>
      </section>

      {/* What is DealLinked Section */}
      <section style={{
        padding: '100px 60px',
        background: 'transparent',
        position: 'relative',
        zIndex: 20,
        overflow: 'hidden'
      }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textAlign: 'center',
          marginBottom: '80px',
          letterSpacing: '-0.03em',
          fontFamily: '"Inter", sans-serif',
          filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
        }}>
          What is DealLinked?
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* For Brokers */}
          <div style={{
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(16px)',
            padding: '40px',
            borderRadius: '20px',
            border: '2px solid rgba(0, 184, 212, 0.3)',
            boxShadow: '0 0 40px rgba(0, 184, 212, 0.2), inset 0 0 60px rgba(0, 184, 212, 0.03)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 60px rgba(0, 184, 212, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.3)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 184, 212, 0.2), inset 0 0 60px rgba(0, 184, 212, 0.03)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(0, 184, 212, 0.15)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow: '0 0 30px rgba(0, 184, 212, 0.4)',
              border: '1px solid rgba(0, 184, 212, 0.3)'
            }}>
              <Building2 size={32} color="#00b8d4" />
            </div>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '16px'
            }}>
              For Brokers
            </h3>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: '1.7',
              marginBottom: '24px'
            }}>
              Publish your off-market deals with confidence. Our quality control system ensures only complete, 
              verified listings go live. Build your reputation with every successful transaction.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Quality-controlled publishing (80% completeness)',
                'Merit-based reputation system',
                'NCND legal protection built-in',
                'Direct investor communication',
                'Deal lifecycle tracking'
              ].map((item, idx) => (
                <li key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '12px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '15px'
                }}>
                  <CheckCircle size={20} color="#00b8d4" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* For Investors */}
          <div style={{
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(16px)',
            padding: '40px',
            borderRadius: '20px',
            border: '2px solid rgba(0, 184, 212, 0.3)',
            boxShadow: '0 0 40px rgba(0, 184, 212, 0.2), inset 0 0 60px rgba(0, 184, 212, 0.03)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 60px rgba(0, 184, 212, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.3)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 184, 212, 0.2), inset 0 0 60px rgba(0, 184, 212, 0.03)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(0, 184, 212, 0.15)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow: '0 0 30px rgba(0, 184, 212, 0.4)',
              border: '1px solid rgba(0, 184, 212, 0.3)'
            }}>
              <Users size={32} color="#00b8d4" />
            </div>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '16px'
            }}>
              For Investors
            </h3>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: '1.7',
              marginBottom: '24px'
            }}>
              Find verified off-market commercial properties from trusted brokers. Browse quality-controlled 
              listings with complete information and NCND protection on every deal.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Verified off-market listings only',
                'Broker reputation scores visible',
                'NCND protection before viewing',
                'Complete deal information guaranteed',
                'Direct broker communication'
              ].map((item, idx) => (
                <li key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '12px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '15px'
                }}>
                  <CheckCircle size={20} color="#00b8d4" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '100px 60px',
        background: 'transparent',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textAlign: 'center',
          marginBottom: '20px',
          letterSpacing: '-0.03em',
          fontFamily: '"Inter", sans-serif',
          filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
        }}>
          Built for Serious Professionals
        </h2>
        <p style={{
          fontSize: '18px',
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          marginBottom: '80px',
          maxWidth: '700px',
          margin: '0 auto 80px'
        }}>
          Advanced tools that ensure deal quality, protect your information, and reward integrity.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '30px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {[
            {
              icon: <Shield size={32} />,
              title: 'NCND Protection',
              description: 'Digital signatures with complete audit trail. Every interaction is legally protected.'
            },
            {
              icon: <Award size={32} />,
              title: 'Broker Reputation',
              description: 'Data-driven quality scores. Premium brokers get priority visibility.'
            },
            {
              icon: <FileCheck size={32} />,
              title: '80% Completeness',
              description: 'Quality control on every listing. No incomplete or speculative deals.'
            },
            {
              icon: <TrendingUp size={32} />,
              title: 'Deal Tracking',
              description: 'Full lifecycle tracking from published to closed. Complete transparency.'
            },
            {
              icon: <Clock size={32} />,
              title: 'Fast Response',
              description: 'Response time tracking. Fast brokers get rewarded with better visibility.'
            },
            {
              icon: <Users size={32} />,
              title: 'Verified Community',
              description: 'Merit-based system. Only legitimate deals from committed sellers.'
            }
          ].map((feature, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(10, 10, 10, 0.6)',
                backdropFilter: 'blur(16px)',
                padding: '32px',
                borderRadius: '16px',
                border: '1px solid rgba(0, 184, 212, 0.2)',
                boxShadow: '0 0 30px rgba(0, 184, 212, 0.1), inset 0 0 40px rgba(0, 184, 212, 0.02)',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.5)';
                e.currentTarget.style.boxShadow = '0 0 50px rgba(0, 184, 212, 0.3), inset 0 0 40px rgba(0, 184, 212, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.2)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 184, 212, 0.1), inset 0 0 40px rgba(0, 184, 212, 0.02)';
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                background: 'rgba(0, 184, 212, 0.15)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                color: '#00b8d4',
                boxShadow: '0 0 20px rgba(0, 184, 212, 0.4)',
                border: '1px solid rgba(0, 184, 212, 0.3)'
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: '1.6'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section - BuyBoxCartel Structure with DealLinked Aesthetic */}
      <section style={{
        padding: '100px 60px',
        background: 'transparent',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textAlign: 'center',
          marginBottom: '20px',
          letterSpacing: '-0.03em',
          fontFamily: '"Inter", sans-serif',
          filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
        }}>
          Simple, Transparent Pricing
        </h2>
        <p style={{
          fontSize: '18px',
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          marginBottom: '60px'
        }}>
          One plan. Full access. No hidden fees.
        </p>

        <div style={{
          maxWidth: '520px',
          margin: '0 auto',
          background: 'rgba(15, 15, 15, 0.9)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          padding: '48px',
          border: '3px solid #00b8d4',
          boxShadow: '0 0 80px rgba(0, 184, 212, 0.6), inset 0 0 80px rgba(0, 184, 212, 0.05)',
          position: 'relative',
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 100px rgba(0, 184, 212, 0.8), inset 0 0 80px rgba(0, 184, 212, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 80px rgba(0, 184, 212, 0.6), inset 0 0 80px rgba(0, 184, 212, 0.05)';
        }}
        >
          <div style={{
            position: 'absolute',
            top: '-16px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 24px',
            background: '#00b8d4',
            borderRadius: '20px',
            color: '#000',
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            boxShadow: '0 0 30px rgba(0, 184, 212, 0.8)'
          }}>
            Professional
          </div>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              fontSize: '56px', 
              fontWeight: '800', 
              color: '#fff', 
              marginBottom: '8px',
              textShadow: '0 0 40px rgba(0, 184, 212, 0.4)'
            }}>
              $39.99
              <span style={{ fontSize: '24px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>/month</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>
              Full access to broker and investor features
            </p>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
            {[
              'Unlimited deal publishing',
              'Browse entire marketplace',
              'NCND digital signatures',
              'Broker reputation system',
              'Advanced CRM tools',
              'Deal lifecycle tracking',
              'Direct messaging',
              'Priority support'
            ].map((feature, idx) => (
              <li key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '14px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '15px',
                fontWeight: '500'
              }}>
                <CheckCircle size={20} color="#00b8d4" style={{ flexShrink: 0 }} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => navigate('/signup')}
            style={{
              width: '100%',
              padding: '18px',
              background: '#00b8d4',
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 0 40px rgba(0, 184, 212, 0.6), 0 6px 20px rgba(0, 184, 212, 0.3)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 0 60px rgba(0, 184, 212, 0.8), 0 10px 30px rgba(0, 184, 212, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 184, 212, 0.6), 0 6px 20px rgba(0, 184, 212, 0.3)';
            }}
          >
            Get Started Now
          </button>

          <p style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '13px',
            marginTop: '16px'
          }}>
            No credit card required to start
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* Testimonials Section - Grid Layout */}
      <section style={{
        padding: '100px 60px',
        background: 'transparent',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Header with Join Others button */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '60px'
          }}>
            <h2 style={{
              fontSize: '48px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.03em',
              fontFamily: '"Inter", sans-serif',
              filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))',
              margin: '0 0 8px 0'
            }}>
              What Our Members Say
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.5)',
              margin: 0
            }}>
              Real results from real people
            </p>
            <button
              onClick={() => navigate('/signup')}
              style={{
                padding: '0',
                background: 'transparent',
                border: 'none',
                color: '#00b8d4',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Join others
            </button>
          </div>

          {/* Reviews Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px'
          }}>
            {[
              {
                text: "DealLinked transformed how I source off-market deals. The quality control and NCND protection give me confidence every deal is legitimate.",
                author: "Sarah M.",
                role: "Commercial Real Estate Investor"
              },
              {
                text: "As a broker, the reputation system helps me stand out. My verified listings get priority visibility, and I've closed 3 deals in the first month.",
                author: "Michael R.",
                role: "Commercial Broker"
              },
              {
                text: "Finally, a marketplace that weeds out the noise. Only serious brokers with quality deals. The completeness requirements ensure I'm not wasting time.",
                author: "Jennifer L.",
                role: "Private Equity Investor"
              },
              {
                text: "The NCND digital signature system is brilliant. I feel protected sharing my off-market opportunities, and buyers appreciate the professionalism.",
                author: "David K.",
                role: "Off-Market Specialist"
              },
              {
                text: "Best platform for commercial real estate. The deal tracking and CRM features keep everything organized in one place.",
                author: "Robert T.",
                role: "Real Estate Developer"
              },
              {
                text: "Quality over quantity - exactly what the industry needed. Every listing I've seen has been complete and from committed sellers.",
                author: "Amanda S.",
                role: "Institutional Investor"
              }
            ].map((review, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(10, 10, 10, 0.6)',
                  backdropFilter: 'blur(16px)',
                  padding: '32px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Profile Picture Placeholder */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.3) 0%, rgba(0, 184, 212, 0.1) 100%)',
                  border: '2px solid rgba(0, 184, 212, 0.3)',
                  marginBottom: '20px'
                }} />

                {/* Review Text */}
                <p style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: '1.6',
                  marginBottom: '20px',
                  fontFamily: '"Inter", sans-serif'
                }}>
                  "{review.text}"
                </p>

                {/* Author Info */}
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#fff',
                    marginBottom: '4px'
                  }}>
                    {review.author}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontWeight: '400'
                  }}>
                    {review.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '100px 60px',
        background: 'rgba(0, 184, 212, 0.05)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid rgba(0, 184, 212, 0.2)',
        borderBottom: '1px solid rgba(0, 184, 212, 0.2)'
      }}>
        <h2 style={{
          fontSize: '52px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '24px',
          letterSpacing: '-0.03em',
          fontFamily: '"Inter", sans-serif',
          filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
        }}>
          Ready to Get Started?
        </h2>
        <p style={{
          fontSize: '20px',
          color: 'rgba(255,255,255,0.7)',
          marginBottom: '48px',
          maxWidth: '700px',
          margin: '0 auto 48px'
        }}>
          Join the marketplace where quality meets opportunity. 
          Connect with serious investors and trusted brokers today.
        </p>
        
        <button
          onClick={() => navigate('/signup')}
          style={{
            padding: '20px 48px',
            background: '#00b8d4',
            border: 'none',
            borderRadius: '12px',
            color: '#000',
            fontSize: '20px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 0 50px rgba(0, 184, 212, 0.6), 0 10px 40px rgba(0, 184, 212, 0.3)',
            transition: 'all 0.3s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 0 70px rgba(0, 184, 212, 0.8), 0 15px 50px rgba(0, 184, 212, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 50px rgba(0, 184, 212, 0.6), 0 10px 40px rgba(0, 184, 212, 0.3)';
          }}
        >
          Start Free Trial
          <ArrowRight size={24} />
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '60px 60px 40px',
        background: 'transparent',
        color: 'rgba(255,255,255,0.5)',
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid rgba(0, 184, 212, 0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '60px',
          marginBottom: '60px'
        }}>
          <div>
            <img 
              src="https://customer-assets.emergentagent.com/job_805e556f-4159-4595-8a8e-d3bb43ff0c72/artifacts/72aahevp_DealLinked.png"
              alt="DealLinked"
              style={{
                height: '28px',
                marginBottom: '16px'
              }}
            />
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255,255,255,0.5)'
            }}>
              The professional marketplace for off-market commercial real estate.
            </p>
          </div>

          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Product
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Features', 'Pricing', 'Marketplace', 'CRM'].map(item => (
                <li key={item} style={{ marginBottom: '10px' }}>
                  <a 
                    href="#" 
                    style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      textDecoration: 'none', 
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#00b8d4';
                      e.currentTarget.style.textShadow = '0 0 10px rgba(0, 184, 212, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                      e.currentTarget.style.textShadow = 'none';
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Company
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['About', 'Blog', 'Careers', 'Contact'].map(item => (
                <li key={item} style={{ marginBottom: '10px' }}>
                  <a 
                    href="#" 
                    style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      textDecoration: 'none', 
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#00b8d4';
                      e.currentTarget.style.textShadow = '0 0 10px rgba(0, 184, 212, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                      e.currentTarget.style.textShadow = 'none';
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Legal
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Privacy Policy', 'Terms of Service', 'NCND Agreement'].map(item => (
                <li key={item} style={{ marginBottom: '10px' }}>
                  <a 
                    href="#" 
                    style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      textDecoration: 'none', 
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#00b8d4';
                      e.currentTarget.style.textShadow = '0 0 10px rgba(0, 184, 212, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                      e.currentTarget.style.textShadow = 'none';
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(0, 184, 212, 0.1)',
          paddingTop: '32px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.4)'
        }}>
          © 2025 DealLinked. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
