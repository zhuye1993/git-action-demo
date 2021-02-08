<template>
  <div id="app">
    <!-- <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </div>
    <router-view/> -->
    <div class="test"></div>
    <svg-icon iconClass='test1' className='icon'></svg-icon>
    <Child1 @click="test" msg="111" name="666"/>
<!-- <svg xmlns="http://www.w3.org/2000/svg"
     width="150" height="100" viewBox="0 0 3 2">

  <rect width="1" height="2" x="0" fill="#008d46" />
  <rect width="1" height="2" x="1" fill="#ffffff" />
  <rect width="1" height="2" x="2" fill="#d2232c" />
</svg> -->
    <input type="file" @change="fileUpload" />
    <el-button @click="handleUpload">上传</el-button>
    <el-button @click="handleResume">恢复</el-button>
    <el-button @click="handlePause">暂停</el-button>
    <!-- <img @load="revoke" :src="imgSrc" alt=""> -->
    <div>
      <div>计算文件hash</div>
      <el-progress :percentage="hashPercentage"></el-progress>
      <div>总进度</div>
      <el-progress :percentage="fakeUploadPercentage"></el-progress>
    </div>
    <div>
      <el-table :data="data">
        <el-table-column prop="hash" label="切片hash" align="center"></el-table-column>
        <el-table-column  label="大小（Kb）" align="center" width="120">
            <template v-slot="{row}">
              {{row.size | transformByte}}
            </template>
        </el-table-column>
        <el-table-column  label="进度" align="center">
          <template v-slot="{row}">
              <!-- {{row.size | transformByte}} -->
              <el-progress :percentage="row.percentage" color="#909399"></el-progress>
            </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
const Status = {
  wait: 'wait',
  uploading: 'uploading',
  pause: 'pause'
}
const SIZE = 0.25*1024*1024
import axios from 'axios'
import SvgIcon from './components/SvgIcon.vue'
import Child1 from '@/components/Child1.vue'
export default {
  components: { SvgIcon, Child1 },
  mounted () {
    // document.cookie = 'name=123'
  },
  filters: {
    transformByte(val) {
      return Number((val/1024).toFixed(0))
    }
  },
  data: () => ({
      fakeUploadPercentage: 0,
      imgSrc: '',
      container: { // 将任务放在一起
        file: null,
        hash: ''
      },
      hashPercentage: 0,
      data: [],
      status: Status.wait,
      requestList: []
    }),
  watch: {
    uploadPercentage(now) {
      if (now > this.fakeUploadPercentage) this.fakeUploadPercentage = now
    }
  },
  computed: {
    uploadPercentage() {
      if(!this.container.file || !this.data.length) return 0
      const loaded = this.data
        .map(item => item.size * item.percentage)
        .reduce((acc, cur)=> acc+cur)

        return parseInt((loaded/this.container.file.size).toFixed(2))
    }
  },
  methods: {
    test() {
      console.log(1111111111111, this.hashPercentage);
    },
    async handleResume() {
      this.status = Status.uploading
      const {uploadedList} = await this.verifyUpload(
        this.container.file.name,
        this.container.hash
      ) 
      await this.uploadChunks(uploadedList)
    },
    handlePause() {
      this.status = Status.pause // 状态
      this.resetData()
    },
    resetData() {
      this.requestList.forEach(xhr => xhr.abort())
      this.requestList = []
      if(this.container.worker) {
        this.container.worker.onmessage = null
      }
    },
    calculateHash(fileChunkList) {
      return new Promise(resolve => {
        // js单线程的，UI是主线程
        // html5 web workers 单独开一个线程，独立于子线程
        // 回调主线程 不会影响原来的UI
        this.container.worker = new Worker('/hash.js')
        this.container.worker.postMessage({fileChunkList})
        this.container.worker.onmessage = e => {
          // console.log(e.data);
          const {percentage,hash} = e.data
          this.hashPercentage = percentage
          if(hash) {
            resolve(hash)

          }
        }
      })
    },
    async handleUpload() {
      // const xhr = new XMLHttpRequest()
      //   xhr.open('GET', 'http://localhost:3000/test')
      //   // xhr.upload.onprogress = onProgress
      //   // Object.keys(headers).forEach(key => {
      //   //   xhr.setRequestHeader(key, headers[key]) // 请求加头
      //   // })
      //   xhr.withCredentials = true
      //   xhr.send()
      //   xhr.onload = e => {
      //     console.log(e);
      //   }
      axios.defaults.withCredentials = true
        axios.get('http://localhost:3000/test')
          .then(function (response) {
            console.log(response);
          })
      if(!this.container.file) return 
      this.status = Status.uploading
      const fileChunkList = this.createFileChunk(this.container.file)
      // console.log(fileChunkList);
      this.container.hash = await this.calculateHash(fileChunkList)
      // 文件 hash 没必要上传同一个文件多次
      const {shouldUpload, uploadedList} = await this.verifyUpload( // 上传，验证
        this.container.file.name,
        this.container.hash
      )
      // console.log(shouldUpload, uploadedList);
      if(!shouldUpload) {
        this.$message.success("秒传：上传成功")
        this.status = Status.wait
        return 
      }
      this.data = fileChunkList.map(({file},index)=>({
        fileHash: this.container.hash,
        index,
        hash: this.container.hash + '-' + index,
        chunk: file,
        size: file.size,
        percentage: uploadedList.includes(index) ? 100 : 0
      }))
      await this.uploadChunks(uploadedList)
    },
    async uploadChunks(uploadedList=[]) {
      console.log(this.data, uploadedList);
      const requestList = this.data
        .map(({chunk, hash, index})=> {
          const formData = new FormData()
          formData.append('chunk', chunk)
          formData.append('hash', hash)
          formData.append('filename', this.container.file.name)
          formData.append('fileHash', this.container.hash)
          return { formData, index }
        })
        .map(async ({formData, index})=> this.request({
           url: 'http://localhost:3000/upload',
           data: formData,
           onProgress: this.createProgressHandler(this.data[index]),
           requestList: this.requestList
        }))
        await Promise.all(requestList)
        console.log(uploadedList, requestList, this.data, '1111111111111');
        if(uploadedList.length + requestList.length === this.data.length) {
          await this.mergeRequest()
        }
        // console.log(requestList);
    },
    createProgressHandler(item) {
      return e => {
        item.percentage = parseInt(String(e.loaded/e.total)*100)
        console.log(item.percentage);
      }
    },
    async verifyUpload(filename, hash) {
      const {data} = await this.request({
        url: 'http://localhost:3000/verify',
        headers: {
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          filename,
          hash
        })
      })
      return JSON.parse(data) 
    },
    createFileChunk(file, size = SIZE) {
      const fileChunkList = []
      let cur = 0
      while(cur < file.size) {
        fileChunkList.push({
          file: file.slice(cur, cur+size)
        })
        cur+=size
      }
      return fileChunkList
    },
    async fileUpload (e) {
      const [file] = e.target.files // es6 文件对象
      this.resetData()
      Object.assign(this.$data, this.$options.data())
      this.container.file = file
      // this
      // const file_name = file.name.split('.')[0]
      // console.log(file, file.slice(0,300))
      // console.log(Object.prototype.toString.call(file.slice(0,300))) // Blob
      // console.log(Object.prototype.toString.call(file)) // 
      // let cur = 0, size = 0.25*1024*1024
      // const fileChunkList = [] // blob 数组
      // while(cur < file.size) {
      //   fileChunkList.push({
      //     file: file.slice(cur, cur + size)
      //   })
      //   cur += size
      // }
      // console.log(fileChunkList);
      // const URL = window.URL
      // const objectUrl = URL.createObjectURL(file)
      // this.imgSrc = objectUrl
      // const requestList = fileChunkList
      //   .map(({file}, index)=>{
      //     const formData = new FormData()
      //     formData.append("chunk", file)
      //     formData.append("filename", `${file_name}-${index}`)
      //     return {
      //       formData
      //     }
      //   })
      //   .map(async ({formData}) => this.request({
      //     url: 'http://localhost:3000/upload',
      //     data: formData
      //   }))
      //   await Promise.all(requestList)
      //   await this.mergeRequest()
      //   console.log(requestList);

    },
    revoke() {
      URL.revokeObjectURL(this.imgSrc)
      // console.log('加载完成');
    },
    // 请求封装
    // 1. http 并发blob上传 chunk post
    // 2. 当blob Promise.all 再发送一个merge
    request({url, method='POST', data, headers={}, requestList, onProgress = e=>e}) {
      return new Promise(resolve => {
        const xhr = new XMLHttpRequest()
        xhr.open(method, url)
        xhr.upload.onprogress = onProgress
        Object.keys(headers).forEach(key => {
          xhr.setRequestHeader(key, headers[key]) // 请求加头
        })
        xhr.send(data)
        xhr.onload = e => {
          if(requestList) {
            const xhrIndex = requestList.findIndex(item => item === xhr)
            requestList.splice(xhrIndex, 1)
          }
          resolve({
            data: e.target.response
          })
        }
        if(requestList) {
          requestList.push(xhr)
          console.log(requestList);
        }
      })
    },
    async mergeRequest () {
      await this.request({
        url: "http://localhost:3000/merge",
        headers: {
          "content-type": "application/json"
        },
        data: JSON.stringify({
          size: SIZE,
          fileHash: this.container.hash,
          filename: this.container.file.name
        })
      })
      this.$message.success('上传成功')
      this.status = Status.wait
    }
  },
}  
</script>
<style lang="less">
// .test {
//   width: 100%;
//   height: 100px;
//   background-color: red;
//   position: absolute;
//   top: 0;
//   z-index: 9999;
//   transition: all 0.3s;
//   &:hover {
//     transform: scale(0.95);
//     border-radius: 10px;
//     overflow: hidden;
//     box-shadow: 0 0 10px #afafaf;
//   }
// }
.icon {
  width: 100px;
  height: 100px;
  color: green;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
