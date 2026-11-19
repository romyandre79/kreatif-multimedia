// Chroma Key Fragment Shader (GLSL ES)
// Digunakan di CanvasPreview untuk real-time green/blue screen removal

export const CHROMA_KEY_VERTEX = `
  attribute vec2 aPosition;
  attribute vec2 aTextureCoord;
  varying vec2 vTextureCoord;

  void main(void) {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
  }
`;

export const CHROMA_KEY_FRAGMENT = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform vec3 uKeyColor;
  uniform float uSimilarity;
  uniform float uSmoothness;

  void main(void) {
    vec4 texColor = texture2D(uSampler, vTextureCoord);
    float diff = distance(texColor.rgb, uKeyColor);
    float alpha = smoothstep(uSimilarity, uSimilarity + uSmoothness, diff);
    gl_FragColor = vec4(texColor.rgb, texColor.a * alpha);
  }
`;

export const TRANSITION_FRAGMENT = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uTextureFrom;
  uniform sampler2D uTextureTo;
  uniform float uProgress;
  uniform int uTransitionType;  // 0=dissolve, 1=wipe_left, 2=fade_through_black

  void main(void) {
    vec4 colorFrom = texture2D(uTextureFrom, vTextureCoord);
    vec4 colorTo   = texture2D(uTextureTo, vTextureCoord);

    if (uTransitionType == 0) {
      gl_FragColor = mix(colorFrom, colorTo, uProgress);
    } else if (uTransitionType == 1) {
      float edge = step(vTextureCoord.x, uProgress);
      gl_FragColor = mix(colorFrom, colorTo, edge);
    } else {
      float mid = 0.5;
      if (uProgress < mid) {
        gl_FragColor = mix(colorFrom, vec4(0.0, 0.0, 0.0, 1.0), uProgress / mid);
      } else {
        gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), colorTo, (uProgress - mid) / mid);
      }
    }
  }
`;
