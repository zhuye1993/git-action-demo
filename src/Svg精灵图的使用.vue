<template>
  <div id="app">
    <svg-icon iconClass='test1' className='icon'></svg-icon>
  </div>
</template>

<script>
import SvgIcon from './components/SvgIcon.vue'
export default {
  components: { SvgIcon },
}  
</script>
<style lang="less">
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
</style>
