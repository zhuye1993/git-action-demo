const http = require('http')
const path = require('path')
const multiparty = require('multiparty')
const fse = require("fs-extra"); // fs扩展包
const mergeFileChunk = require("./index")
const server = http.createServer()
const Controller = require('./controller')
const controller = new Controller()

const UPLOAD_DIR = path.resolve(__dirname, '.', 'target')
server.on('request', async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080")
    // res.setHeader("Access-Control-Allow-Headers", "application/json")
    res.setHeader("Access-Control-Allow-Credentilas", 'true')
    if(req.method === 'OPTIONS') {
        res.status = 200
        res.end()
        return 
    }
    // console.log(req);
    if(req.url === '/verify') {
        await controller.handleVerifyUpload(req, res)
        return
    }
    if(req.url === '/test') {
        console.log('-----------------');
        res.status = 200
        res.setHeader('Set-Cookie', 'cookie1=va')
        res.end()
        return 
    }

    if(req.url === '/upload') {
        await controller.handleFormDataUpload(req, res)
        return
    }

    if(req.url === '/merge') {
        console.log('合并开始--------------');
        await controller.handleMerge(req, res)
        return
    }
    // res.end("hello")
    // if (req.url == "/upload") {
    //     const multipart = new multiparty.Form()
    //     multipart.parse(req, async (err, fields, files) => {
    //         if (err) return
    //         const [chunk] = files.chunk  // 拿到文件块
    //         const [filename] = fields.filename

    //         const dir_name = filename.split('-')[0]
    //         const chunkDir = path.resolve(UPLOAD_DIR, dir_name)
    //         if (!fse.existsSync(chunkDir)) {
    //             await fse.mkdirs(chunkDir)
    //         }
    //         await fse.move(chunk.path, `${chunkDir}/${filename}`)
    //     })
    //     res.end("hello")
    //     return
    // } else if (req.url == "/merge") {
    //     const filename = 'yb'
    //     const filePath = path.resolve(UPLOAD_DIR, '..', `${filename}.jpeg`)
    //     mergeFileChunk(filePath, filename, 0.25 * 1024 * 1024)
    //     res.end("ok")
    //     return

    // }
})
server.listen(3000, () => console.log(3000))