import { createApp } from 'vue'
// Fonts are bundled with the site, so no request leaves for a font service.
import '@fontsource-variable/manrope'
import '@fontsource-variable/fraunces'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
