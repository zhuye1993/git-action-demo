const path = require("path")
const fse = require("fs-extra"); // fs扩展包

// 合并文件的块
const UPLOAD_DIR = path.resolve(__dirname,'.', "target")
// console.log(UPLOAD_DIR);
const filename = 'yb'
const filePath = path.resolve(UPLOAD_DIR, '..', `${filename}.jpeg`)
// console.log(filePath);

const pipeStream = (path, wirteStream) =>
    new Promise(resolve=>{
        const readStream = fse.createReadStream(path)
        readStream.on("end", ()=>{
            // 删除文件
            fse.unlinkSync(path)
            resolve()
        })
        readStream.pipe(wirteStream)
    })

module.exports = async (filePath, filename, size) => {
    console.log('-------------', '合并');
    // console.log(filePath, filename, size);
    // 大文件上传，设计的后端思想，每个要上传的文件件，先以文件名，为target的目录名，把分文件blob，放入这个目录，合并
    const chunkDir = path.resolve(UPLOAD_DIR, filename)
    console.log(chunkDir);
    const chunkPaths = await fse.readdir(chunkDir)
    chunkPaths.sort((a,b)=>a.split(/[-.]/)[1] - b.split(/[-.]/)[1])
    // console.log(chunkPaths[0].split(/[-.]/)[1]);
    // console.log(chunkPaths, '--------------');
    await Promise.all(
        chunkPaths.map((chunkPath, index)=>
            pipeStream(
                path.resolve(chunkDir, chunkPath),
                fse.createWriteStream(filePath, {
                    start: index*size,
                    end: (index+1)*size
                })
            )
        )
    )
    console.log('文件合并成功');
    fse.rmdirSync(chunkDir)
}

// mergeFileChunk(filePath, filename, 0.25*1024*1024)