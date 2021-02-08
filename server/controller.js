const path = require('path')
const fse = require('fs-extra')
const UPLOAD_DIR = path.resolve(__dirname, '.', 'target')
const multiparty = require('multiparty')
const extractExt = filename => 
    filename.slice(filename.lastIndexOf('.'))
const resolvePost = req => 
    new Promise(resolve => {
        let chunk = ''
        req.on('data', data => {
            chunk += data; // 二进制
        })
        req.on('end', ()=>{
            resolve(JSON.parse(chunk))
        })
    })

    const pipeStream = (path, writeStream) =>
        new Promise(resovle => {
            const readStream = fse.createReadStream(path)
            readStream.on('end', ()=> {
                resovle()
            })
            readStream.pipe(writeStream)
        })

const mergeFileChunk  = async (filePath, fileHash, size) => {
    const chunkDir = path.resolve(UPLOAD_DIR, fileHash)
    const chunkPaths = await fse.readdir(chunkDir)
    chunkPaths.sort((a,b)=> a.split('-')[1]- b.split('-')[1])
    await Promise.all(
        chunkPaths.map((chunkPath, index) =>
            pipeStream(
                path.resolve(chunkDir, chunkPath),
                fse.createWriteStream(filePath, {
                    start: index*size,
                    end: (index+1)*size
                })
            ))
    )
}

module.exports = class {
    async handleVerifyUpload(req,res) {
        // res.end('verify')
        // 服务器端有没有这个文件
        // 拿到post中的data
        const {filename, hash} = await resolvePost(req)
        const ext = extractExt(filename)
        const filePath = path.resolve(UPLOAD_DIR, `${hash}${ext}`)
        if(fse.existsSync(filePath)) {
            res.end(JSON.stringify({
                shouldUpload: false
            }))
        }else {
            res.end(JSON.stringify({
                shouldUpload: true,
                uploadedList: []
            }))
        }
    }
    async handleFormDataUpload(req, res) {
        const multipart = new multiparty.Form()
        multipart.parse(req, async (err, fields, files) => {
            if (err) return
            const [chunk] = files.chunk  // 拿到文件块
            const [hash] = fields.hash
            const [fileHash] = fields.fileHash
            const [filename] = fields.filename
            // console.log(chunk);
            // const dir_name = filename.split('-')[0]
            const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${extractExt(filename)}`)
            const chunkDir = path.resolve(UPLOAD_DIR, fileHash)
            // const chunkDir = path.resolve(UPLOAD_DIR, dir_name)
            if(fse.existsSync(filePath)) {
                res.end('exits')
                return 
            }
            if (!fse.existsSync(chunkDir)) {
                await fse.mkdirs(chunkDir)
            }
            await fse.move(chunk.path, path.resolve(chunkDir, hash))
            res.end("ok")
        })
    }
    async handleMerge(req, res) {
        const data = await resolvePost(req)
        const {fileHash, filename, size} = data
        const ext = extractExt(filename)
        const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${ext}`)
        console.log(filePath)
        await mergeFileChunk(filePath, fileHash, size);
        res.end(
            JSON.stringify({
                code: 0 ,
                message: 'file merged success'
            })
        )
    }
}