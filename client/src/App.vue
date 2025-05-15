<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
<div class="app-container"> 
  <RouterView />
</div>

</template>

<style>
/* 重置默认样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.app-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  html {
    font-size: 14px;
  }
}

/* 平板适配 */
@media screen and (min-width: 769px) and (max-width: 1024px) {
  html {
    font-size: 16px;
  }
}

/* PC端适配 */
@media screen and (min-width: 1025px) {
  html {
    font-size: 16px;
  }
}
</style>
