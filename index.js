var PNGEncoder = require('png-stream/encoder')
var glPixelStream = require('gl-pixel-stream')
var assign = require('object-assign')

var versionError = 'Could not find __webglFramebuffer on the target.\n' +
  'Ensure you are using r69-r71 or r74+ of ThreeJS, and that you have\n' +
  'already rendered to your WebGLRenderTarget like so:\n' +
  '   renderer.render(scene, camera, target);'

module.exports = threePixelStream
function threePixelStream (renderer, target, opt) {
  if (typeof THREE === 'undefined') throw new Error('THREE is not defined in global scope')
  if (!renderer || typeof renderer.getContext !== 'function') {
    throw new TypeError('Must specify a ThreeJS WebGLRenderer.')
  }

  var gl = renderer.getContext()
  if (!target) {
    throw new TypeError('Must specify WebGLRenderTarget,\npopulated with the contents for export.')
  }
  
  opt = opt || {}
  var format = opt.format
  if (!format && target.texture && target.texture.format) {
    format = target.texture.format
  } else if (!format) {
    format = target.format
  }
  
  var glFormat = getGLFormat(gl, format)
  var shape = [ target.width, target.height ]
  
  var framebuffer = target.__webglFramebuffer
  if (!framebuffer) {
    if (!renderer.properties) {
      throw new Error(versionError)
    }
    var props = renderer.properties.get(target)
    if (!props) throw new Error(versionError)
    framebuffer = props.__webglFramebuffer
  }
  
  opt = assign({
    flipY: true
  }, opt, {
    format: glFormat
  })
  
  var encoder = new PNGEncoder(shape[0], shape[1], {
    colorSpace: getColorSpace(gl, glFormat)
  })
  
  var stream = glPixelStream(gl, framebuffer, shape, opt)
  stream.pipe(encoder)
  stream.on('error', function (err) {
    encoder.emit('error', err)
  })
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