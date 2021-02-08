<template>
    <div>
        子组件2
        <!-- {{$attrs.msg}} -->
        <div v-for="(item, key) in $attrs" :key="item">{{key}}---------{{item}}</div>
        <button>传父</button>
    </div>
</template>