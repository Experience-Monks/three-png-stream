var PNGEncoder = require('png-stream/encoder')
var glPixelStream = require('gl-pixel-stream')
var assign = require('object-assign')

module.exports = threePixelStream
function threePixelStream (gl, target, opt) {
  if (typeof THREE === 'undefined') throw new Error('THREE is not defined in global scope')
  if (!gl) throw new TypeError('Must specify a gl context.\nYou can use "renderer.getContext()"')
  if (!target) throw new TypeError('Must specify WebGLRenderTarget,\npopulated with the contents for export.')
  
  opt = opt || {}
  var format = opt.format
  if (!format && target.texture && target.texture.format) {
    format = target.texture.format
  } else if (!format) {
    format = target.format
  }
  
  var glFormat = getGLFormat(gl, format)
  var shape = [ target.width, target.height ]
  
  if (!target.__webglFramebuffer) {
    throw new Error('Could not find __webglFramebuffer on the target.\n' +
        'Ensure you are using r69-r71 of ThreeJS, and that you have\n' +
        'already rendered to your WebGLRenderTarget like so:\n' +
        '   renderer.render(scene, camera, target);')
  }
  
  opt = assign({
    flipY: true
  }, opt, {
    format: glFormat
  })
  
  var encoder = new PNGEncoder(shape[0], shape[1], {
    colorSpace: getColorSpace(gl, glFormat)
  })
  
  var stream = glPixelStream(gl, target.__webglFramebuffer, shape, opt)
  stream.pipe(encoder)
  return encoder
}

function getGLFormat (gl, format) {
  switch (format) {
    case THREE.RGBFormat: return gl.RGB
    case THREE.RGBAFormat: return gl.RGBA
    case THREE.LuminanceFormat: return gl.LUMINANCE
    case THREE.LuminanceAlphaFormat: return gl.LUMINANCE_ALPHA
    case THREE.AlphaFormat: return gl.ALPHA
    default: throw new TypeError('unsupported format ' + format)
  }
}

function getColorSpace (gl, format) {
  switch (format) {
    case gl.RGBA: return 'rgba'
    case gl.RGB: return 'rgb'
    case gl.LUMINANCE_ALPHA: return 'graya'
    case gl.LUMINANCE:
    case gl.ALPHA:
      return 'gray'
    default:
      throw new TypeError('unsupported format option ' + format)
  }
}