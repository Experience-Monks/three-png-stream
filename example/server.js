const budo = require('budo')
const path = require('path')
const fs = require('fs')
const URL = require('url')
const wsStream = require('websocket-stream')
const getPorts = require('get-ports')
const http = require('http')
const qs = require('query-string')
const createEnvify = require('envify/custom')
const progressStream = require('progress-stream')
const cliSpinner = require('ora')
const prettyBytes = require('pretty-bytes')
const prettyMS = require('pretty-ms')

const noop = () => {}

// We use a separate server for the websocket stuff
// since it does not seem compatible alongside 'ws' module,
// which is used by budo's LiveReload client
const DEFAULT_BUDO_PORT = 9966
const DEFAULT_IMAGE_PORT = 33049

getPorts([ DEFAULT_BUDO_PORT, DEFAULT_IMAGE_PORT ], (err, ports) => {
  if (err) throw err
  const devPort = ports[0]
  const imgPort = ports[1]
  devServer(devPort, imgPort)
  imageServer(imgPort)
})

function imageServer (port) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, 'ok')
    res.end('Hello! This is the image server for WebGL file saving.')
  });
  server.listen(port, () => {
    console.log(`Image server: http://localhost:${port}/`);
  });

  wsStream.createServer({
    perMessageDeflate: false,
    server: server
  }, function(stream, req) {
    const search = URL.parse(req.url).search;
    const query = qs.parse(search)
    handleImageStream(stream, query.file)
  })
}

function handleImageStream (imageStream, fileName = 'test.png', cb) {
  cb = cb || noop
  const timeStart = Date.now()
  const file = path.resolve(__dirname, fileName)
  const fileRelative = path.relative(process.cwd(), file)
  const spinner = cliSpinner('Receiving canvas...').start()

  const writeStream = fs.createWriteStream(file)
  writeStream.once('error', err => {
    spinner.fail('ERROR saving PNG to: ' + fileRelative)
    console.error(err)
    cb(err)
    cb = noop
  })
  writeStream.on('close', function () {
    const end = Date.now()
    spinner.succeed('Saved PNG canvas to: ' + fileRelative + ' in ' + prettyMS(end - timeStart))
    cb(null)
    cb = noop
  })

  const progress = progressStream({
    time: 100
  }).on('progress', (ev) => {
    spinner.text = `Transferred: ${prettyBytes(ev.transferred)}`
  });
  imageStream
    .pipe(progress)
    .pipe(writeStream)
}

function devServer (port, imagePort) {
  budo.cli(process.argv.slice(2), {
    live: true,
    port: port,
    portfind: false,
    dir: path.resolve(__dirname, 'app'),
    browserify: {
      transform: [
        [ 'babelify', { presets: 'es2015' } ],
        createEnvify({
          IMAGE_SERVER_PORT: imagePort
        })
      ]
    },
    serve: 'bundle.js'
  })
}