<template>
  <div class="vip-welcome-mask" role="dialog" aria-modal="true" aria-label="黑金VIP欢迎">
    <div class="vip-welcome-card">
      <div class="vip-crown">黑金 VIP</div>
      <div class="vip-welcome-title vip-two-tone">尊贵身份已激活</div>
      <p class="vip-welcome-text">您是尊贵的黑金VIP，欢迎您使用巨信cheat</p>
      <button class="vip-enter-btn" @click="$emit('enter')">进入巨信cheat</button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['enter']);
</script>

<style scoped>
.vip-welcome-mask { position: fixed; inset: 0; z-index: 900; display: flex; align-items: center; justify-content: center; padding: 22px; background: rgba(3, 3, 2, .82); }
.vip-welcome-card { width: min(420px, 100%); padding: 32px 24px 24px; border-radius: 22px; background: #0b0904; border: 1px solid #8f6a19; box-shadow: none; text-align: center; }
.vip-crown { display: inline-block; padding: 5px 14px; border: 1px solid #a77b20; border-radius: 999px; color: #e8c66b; font-size: 13px; letter-spacing: .18em; }
.vip-welcome-title { width: fit-content; margin: 20px auto 0; font-size: 27px; font-weight: 700; letter-spacing: .06em; }
.vip-welcome-text { margin: 15px auto 24px; max-width: 330px; font-size: 16px; line-height: 1.8; color: #e8d49d; }
.vip-enter-btn { width: 100%; padding: 12px 18px; border-radius: 14px; border: 1px solid #d4af37; background: #151006; color: #f4d77d; font-size: 15px; font-weight: 600; letter-spacing: .05em; }
</style>
