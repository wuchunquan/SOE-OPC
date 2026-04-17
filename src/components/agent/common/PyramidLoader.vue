<template>
  <div class="pyramid-loader">
    <div class="wrapper">
      <span class="side side1"></span>
      <span class="side side2"></span>
      <span class="side side3"></span>
      <span class="side side4"></span>
      <span class="shadow"></span>
    </div>
  </div>
</template>

<style scoped>
.pyramid-loader {
  position: relative;
  width: 24px;
  height: 24px;
  display: block;
  transform-style: preserve-3d;
  transform: rotateX(-20deg);
}

.wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: spin 4s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotateY(360deg);
  }
}

.pyramid-loader .wrapper .side {
  width: 18px;
  height: 18px;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  transform-origin: center top;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.pyramid-loader .wrapper .side1 {
  transform: rotateZ(-30deg) rotateY(90deg);
  background: conic-gradient(#8454ff, #8454ff, #D8CCE6, #8454ff);
}

.pyramid-loader .wrapper .side2 {
  transform: rotateZ(30deg) rotateY(90deg);
  background: conic-gradient(#2F2585, #D8CCE6, #8454ff, #8454ff);
}

.pyramid-loader .wrapper .side3 {
  transform: rotateX(30deg);
  background: conic-gradient(#2F2585, #D8CCE6, #8454ff, #8454ff);
}

.pyramid-loader .wrapper .side4 {
  transform: rotateX(-30deg);
  background: conic-gradient(#8454ff, #6428fd, #D8CCE6, #8454ff);
}

.pyramid-loader .wrapper .shadow {
  width: 16px;
  height: 16px;
  background: #8B5AD5;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  transform: rotateX(90deg) translateZ(-10px);
  filter: blur(4px);
}
</style>
