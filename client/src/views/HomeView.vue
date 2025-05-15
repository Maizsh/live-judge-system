<script setup>
// 组件逻辑
</script>

<template>
  <div class="home">
    <h1 class="title">实时打分系统</h1>
    <div class="button-container">
      <router-link to="/judge" class="button judge">
        <i class="fas fa-gavel"></i>
        我是评委
      </router-link>
      <router-link to="/host" class="button host">
        <i class="fas fa-microphone"></i>
        我是主持人
      </router-link>
      <router-link to="/display" class="button display">
        <i class="fas fa-tv"></i>
        大屏展示
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 20px;
}

.title {
  color: white;
  font-size: 2.5rem;
  margin-bottom: 3rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.button-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: 400px;
}

.button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: bold;
  text-decoration: none;
  color: white;
  transition: transform 0.2s, box-shadow 0.2s;
  border: none;
  gap: 10px;
}

.button:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.2);
}

.judge {
  background: linear-gradient(45deg, #FF416C 0%, #FF4B2B 100%);
}

.host {
  background: linear-gradient(45deg, #4CAF50 0%, #45a049 100%);
}

.display {
  background: linear-gradient(45deg, #2196F3 0%, #1976D2 100%);
}

.button i {
  font-size: 1.4rem;
}
</style>
