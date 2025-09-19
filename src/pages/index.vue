<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from 'hashkeys'
import { PeerPigeonMesh } from 'peerpigeon'

// --- State ---
const auth = useAuth('hk')
const mesh = ref<InstanceType<any> | null>(null)
const connecting = ref(false)
const connected = ref(false)
const signalingUrl = ref<string>(`ws://localhost:3000`)

const logs = ref<string[]>([])
const chatInput = ref('')
const messages = reactive<{ from: string; content: string; ts: number }[]>([])

const localVideo = ref<HTMLVideoElement | null>(null)
const remoteVideos = reactive<Map<string, MediaStream>>(new Map())

// 视频房间相关状态
const roomMasterKey = ref('')
const roomName = ref('')
const roomSignalingUrl = ref('ws://localhost:3000')
const roomMesh = ref<InstanceType<any> | null>(null)
const roomConnecting = ref(false)
const roomConnected = ref(false)
const roomLocalVideo = ref<HTMLVideoElement | null>(null)
const roomRemoteVideos = reactive<Map<string, MediaStream>>(new Map())
const roomPeerCount = ref(0)
const roomMessages = reactive<{ from: string; content: string; ts: number }[]>([])
const roomChatInput = ref('')

// 房间创建和分享相关状态
const showCreateRoom = ref(false)
const createRoomName = ref('')
const createRoomSignalingUrl = ref('ws://localhost:3000')
const roomShareLink = ref('')
const shareRoomInput = ref('')

// 新增状态：用户名输入和密钥展示
const username = ref('')
const masterKeyInput = ref('')
const showKeyDetails = ref(false)
const keyData = reactive({
  publicKey: '',
  identity: '',
  encryptionKey: '',
  curve: '',
  masterKey: '',
  signatures: [] as Array<{ message: string; signature: string; publicKey: string; timestamp: number; verified?: boolean; verifying?: boolean }>
})

// 本地指令：将绑定的 MediaStream 赋值到 video.srcObject
const vSrcObject = {
  mounted(el: HTMLVideoElement, binding: any) {
    if (el && 'srcObject' in el) {
      // @ts-ignore
      el.srcObject = binding.value || null
      // @ts-ignore
      el.play?.().catch(() => {})
    }
  },
  updated(el: HTMLVideoElement, binding: any) {
    if (binding.value !== binding.oldValue) {
      // @ts-ignore
      el.srcObject = binding.value || null
      // @ts-ignore
      el.play?.().catch(() => {})
    }
  }
}
function log(msg: string) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`
  logs.value.unshift(line)
}

// 新增函数：使用passkey注册
async function registerWithPasskey() {
  if (!username.value.trim()) {
    log('请输入用户名')
    return
  }
  try {
    const success = await auth.passKeyAuth(username.value.trim())
    if (success) {
      log(`Passkey注册成功: ${username.value}`)
      await updateKeyData()
    } else {
      log('Passkey注册失败')
    }
  } catch (err: any) {
    log(`Passkey注册错误: ${err?.message || err}`)
  }
}

// 新增函数：使用passkey登录
async function loginWithPasskey() {
  try {
    const success = await auth.passKeyLogin()
    if (success) {
      log('Passkey登录成功')
      await updateKeyData()
    } else {
      log('Passkey登录失败')
    }
  } catch (err: any) {
    log(`Passkey登录错误: ${err?.message || err}`)
  }
}

// 新增函数：使用master key登录
async function loginWithMasterKey() {
  log('Master Key登录按钮被点击')
  console.log('Master Key登录函数被调用', { masterKeyInput: masterKeyInput.value })
  
  if (!masterKeyInput.value.trim()) {
    console.log('请输入Master Key')
    return
  }
  
  // if (!masterKeyInput.value.startsWith('hkmk')) {
  //   console.log('Master Key必须以hkmk开头')
  //   return
  // }
  
  try {
    console.log('开始调用auth.login...')
    await auth.login(masterKeyInput.value.trim())
    console.log('auth.login调用完成')
    
    // 登录成功后auth.authenticated会自动更新
    if (auth.authenticated) {
      console.log('Master Key登录成功')
      await updateKeyData()
      masterKeyInput.value = '' // 清空输入框
    } else {
      console.log('登录后auth.authenticated仍为false')
    }
  } catch (err: any) {
    console.log(`Master Key登录错误: ${err?.message || err}`)
    console.error('Master Key登录错误:', err)
  }
}

// 测试函数：生成并测试master key登录
async function testMasterKeyLogin() {
  try {
    log('开始测试Master Key登录流程...')
    
    // 第一步：用测试密码登录
    log('步骤1: 用测试密码登录')
    await auth.login('test-password-123')
    
    if (!auth.authenticated) {
      log('测试密码登录失败')
      return
    }
    
    log('测试密码登录成功')
    
    // 第二步：获取master key
    log('步骤2: 获取Master Key')
    const masterKey = await auth.getMasterKey()
    log(`获取到Master Key: ${masterKey}`)
    
    // 第三步：退出登录
    log('步骤3: 退出登录')
    await auth.logout()
    
    // 第四步：用master key重新登录
    log('步骤4: 用Master Key重新登录')
    await auth.login(masterKey)
    
    if (auth.authenticated) {
      log('✅ Master Key登录测试成功！')
      await updateKeyData()
    } else {
      log('❌ Master Key登录测试失败')
    }
    
  } catch (err: any) {
    log(`测试过程出错: ${err?.message || err}`)
    console.error('测试错误:', err)
  }
}
 
 // 快速加入测试房间
 async function quickJoinTestRoom() {
   try {
     log('快速加入测试房间...')
     
     // 设置测试房间参数
     roomMasterKey.value = 'test-room-key-123'
     roomName.value = '测试房间'
     roomSignalingUrl.value = 'ws://localhost:3000'
     
     log('已填充测试房间信息，正在连接...')
     
     // 连接到测试房间
     await connectRoom()
     
   } catch (err: any) {
     log(`快速加入测试房间失败: ${err?.message || err}`)
     console.error('快速加入测试房间错误:', err)
   }
 }

// 创建房间函数
async function createRoom() {
  try {
    if (!createRoomName.value.trim()) {
      log('请输入房间名称')
      return
    }
    
    // 生成随机Master Key
    const randomKey = Math.random().toString(36).substring(2, 15)
    
    // 设置房间参数
    roomMasterKey.value = randomKey
    roomName.value = createRoomName.value.trim()
    roomSignalingUrl.value = createRoomSignalingUrl.value
    
    // 连接房间
    await connectRoom()
    
    // 生成分享链接
    generateShareLink()
    
    // 关闭创建房间对话框
    showCreateRoom.value = false
    
    log(`房间创建成功，Master Key: ${randomKey}`)
  } catch (err: any) {
    log(`创建房间失败: ${err?.message || err}`)
    console.error('创建房间错误:', err)
  }
}

// 生成分享链接
function generateShareLink() {
  const shareData = {
    roomName: roomName.value,
    masterKey: roomMasterKey.value,
    signalingUrl: roomSignalingUrl.value
  }
  
  const encodedData = btoa(JSON.stringify(shareData))
  roomShareLink.value = `meshpath://room/${encodedData}`
}

// 解析分享链接
function parseShareLink(link: string) {
  try {
    // 检查链接格式
    if (!link.startsWith('meshpath://room/')) {
      throw new Error('无效的分享链接格式')
    }
    
    // 提取编码数据
    const encodedData = link.replace('meshpath://room/', '')
    const decodedData = atob(encodedData)
    const shareData = JSON.parse(decodedData)
    
    // 验证数据完整性
    if (!shareData.roomName || !shareData.masterKey || !shareData.signalingUrl) {
      throw new Error('分享链接数据不完整')
    }
    
    return shareData
  } catch (err: any) {
    log(`解析分享链接失败: ${err?.message || err}`)
    throw new Error('无法解析分享链接，请检查链接是否正确')
  }
}

// 通过分享链接加入房间
async function joinRoomByShareLink() {
  try {
    if (!shareRoomInput.value.trim()) {
      log('请粘贴房间分享链接')
      return
    }
    
    const shareData = parseShareLink(shareRoomInput.value.trim())
    
    // 设置房间参数
    roomMasterKey.value = shareData.masterKey
    roomName.value = shareData.roomName
    roomSignalingUrl.value = shareData.signalingUrl
    
    // 连接房间
    await connectRoom()
    
    // 清空输入框
    shareRoomInput.value = ''
    
    log('通过分享链接加入房间成功')
  } catch (err: any) {
    log(`通过分享链接加入房间失败: ${err?.message || err}`)
    console.error('通过分享链接加入房间错误:', err)
  }
}

// 复制分享链接
async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(roomShareLink.value)
    log('分享链接已复制到剪贴板')
  } catch (err: any) {
    log(`复制失败: ${err?.message || err}`)
    console.error('复制失败:', err)
  }
}
 
 // 新增函数：更新密钥数据
async function updateKeyData() {
  if (!auth.authenticated) return
  try {
    keyData.publicKey = auth.publicKey || ''
    keyData.identity = auth.identity || ''
    keyData.encryptionKey = auth.encryptionKey || ''
    keyData.curve = auth.curve || ''
    
    // 获取master key
    try {
      const masterKey = await auth.getMasterKey()
      keyData.masterKey = masterKey || ''
    } catch (err: any) {
      log(`获取Master Key失败: ${err?.message || err}`)
      keyData.masterKey = ''
    }
  } catch (err: any) {
    log(`获取密钥数据失败: ${err?.message || err}`)
  }
}

// 新增函数：创建签名
async function createSignature() {
  if (!auth.authenticated) {
    log('请先登录')
    return
  }
  try {
    const message = `测试消息 - ${new Date().toISOString()}`
    const result = await auth.sign({ message })
    keyData.signatures.unshift({
      message,
      signature: result.signature,
      publicKey: result.publicKey,
      timestamp: Date.now()
    })
    log('签名创建成功')
  } catch (err: any) {
    log(`创建签名失败: ${err?.message || err}`)
  }
}

// 新增函数：验证签名
async function verifySignature(sig: { message: string; signature: string; publicKey: string; timestamp: number; verified?: boolean; verifying?: boolean }) {
  try {
    // 设置验证中状态
    sig.verifying = true
    sig.verified = undefined
    
    const result = await auth.verify({
      message: sig.message,
      signature: sig.signature,
      publicKey: sig.publicKey
    })
    const isValid = result?.valid || false
    
    // 更新UI状态
    sig.verified = isValid
    sig.verifying = false
    
    log(`签名验证结果: ${isValid ? '有效' : '无效'}`)
  } catch (err: any) {
    sig.verifying = false
    sig.verified = false
    log(`验证签名失败: ${err?.message || err}`)
  }
}

async function computePeerIdHex(): Promise<string> {
  // Deterministic from identity/publicKey + per-tab session salt for uniqueness across tabs
  const base = auth.publicKey || auth.identity || ''
  let salt = sessionStorage.getItem('meshPeerSalt')
  if (!salt) {
    const buf = new Uint8Array(8)
    crypto.getRandomValues(buf)
    salt = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem('meshPeerSalt', salt)
  }
  const text = `${base}#${salt}` || Math.random().toString()
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash).slice(0, 20)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function connectMesh() {
  if (!auth.authenticated) {
    log('Please login first')
    return
  }
  if (connected.value || connecting.value) return
  connecting.value = true
  try {
    const peerId = await computePeerIdHex()
    log(`Using peerId ${peerId.slice(0,8)}…`)

    const instance = new (PeerPigeonMesh as any)({
      peerId,
      debug: true,
    })

    // Event wiring
    instance.addEventListener?.('messageReceived', (e: any) => {
      const { fromPeerId, from, message, content, timestamp } = e || {}
      let txt: string
      if (typeof content === 'string') {
        txt = content
      } else if (typeof message === 'string') {
        txt = message
      } else if (message && typeof message?.content === 'string') {
        txt = message.content
      } else if (message != null) {
        try { txt = JSON.stringify(message) } catch { txt = String(message) }
      } else {
        txt = ''
      }
      messages.push({ from: fromPeerId || from || 'unknown', content: txt, ts: timestamp || Date.now() })
    })
    instance.addEventListener?.('remoteStream', (e: any) => {
      const { peerId: from, stream } = e || {}
      if (from && stream) {
        remoteVideos.set(from, stream)
      }
    })
    instance.addEventListener?.('broadcastStreamEnabled', () => {
      log('Broadcast streaming enabled for all peers')
    })

    await instance.init()
    await instance.connect(signalingUrl.value)

    // 允许接收远端流事件（即刻释放缓冲的 pendingRemoteStreams）
    try { await instance.enableStreamingForAllPeers?.() } catch {}

    mesh.value = instance
    connected.value = true
    log('Connected to signaling server')
  } catch (err: any) {
    log(`Connect error: ${err?.message || err}`)
  } finally {
    connecting.value = false
  }
}

async function disconnectMesh() {
  try {
    if (mesh.value) {
      try { await mesh.value.stopMedia?.() } catch {}
      try { await mesh.value.disconnect?.() } catch {}
      try { await mesh.value.signalingClient?.disconnect?.() } catch {}
    }
  } finally {
    mesh.value = null
    connected.value = false
    log('Disconnected')
  }
}

async function sendChat() {
  const text = chatInput.value.trim()
  if (!text || !mesh.value) return
  try {
    await mesh.value.sendMessage(text)
    messages.push({ from: 'me', content: text, ts: Date.now() })
    chatInput.value = ''
  } catch (err: any) {
    log(`Send failed: ${err?.message || err}`)
  }
}

async function startMedia() {
  if (!mesh.value) return
  try {
    const stream: MediaStream = await mesh.value.startMedia({ video: true, audio: true })
    if (localVideo.value) {
      localVideo.value.srcObject = stream
      await localVideo.value.play().catch(() => {})
    }
    // 开启广播给所有已连接节点，并允许接收对端流
    try { await mesh.value.enableStreamingForAllPeers?.() } catch {}
    log('Local media started')
  } catch (err: any) {
    log(`Start media failed: ${err?.message || err}`)
  }
}

async function stopMedia() {
  if (!mesh.value) return
  try {
    await mesh.value.stopMedia()
    if (localVideo.value) localVideo.value.srcObject = null
    log('Local media stopped')
  } catch (err: any) {
    log(`Stop media failed: ${err?.message || err}`)
  }
}

// 房间相关函数
async function connectRoom() {
  if (!roomMasterKey.value.trim()) {
    log('请输入房间Master Key')
    return
  }
  
  if (!roomName.value.trim()) {
    log('请输入房间名称')
    return
  }
  
  roomConnecting.value = true
  
  try {
    // 使用房间Master Key创建独立的认证实例
    const roomAuth = useAuth('room')
    await roomAuth.login(roomMasterKey.value.trim())
    
    if (!roomAuth.authenticated) {
      log('房间Master Key验证失败')
      return
    }
    
    // 创建房间专用的mesh实例
     const instance = new PeerPigeonMesh({
       maxPeers: 10,
       enableWebDHT: true,
       enableCrypto: true
     }) as any
     
     // 设置房间ID用于隔离
     instance.roomId = `room_${roomName.value}_${await roomAuth.getPublicKey()}`
    
    await instance.init()
    
    // 监听房间事件
    instance.addEventListener('connected', () => {
      log(`已连接到房间 "${roomName.value}"`)
    })
    
    instance.addEventListener('peerConnected', (data: any) => {
      roomPeerCount.value++
      log(`房间成员加入: ${data.peerId.slice(0, 8)}... (房间人数: ${roomPeerCount.value + 1})`)
    })
    
    instance.addEventListener('peerDisconnected', (data: any) => {
      roomPeerCount.value = Math.max(0, roomPeerCount.value - 1)
      log(`房间成员离开: ${data.peerId.slice(0, 8)}... (房间人数: ${roomPeerCount.value + 1})`)
      roomRemoteVideos.delete(data.peerId)
    })
    
    instance.addEventListener('messageReceived', (data: any) => {
      roomMessages.push({
        from: data.from || 'unknown',
        content: data.content || data.message || '',
        ts: Date.now()
      })
    })
    
    instance.addEventListener('remoteStream', (data: any) => {
      if (data.stream && data.peerId) {
        roomRemoteVideos.set(data.peerId, data.stream)
        log(`房间收到远程视频流: ${data.peerId.slice(0, 8)}...`)
      }
    })
    
    // 连接到信号服务器
    await instance.connect(roomSignalingUrl.value)
    
    roomMesh.value = instance
    roomConnected.value = true
    roomPeerCount.value = 0 // 初始化为0，会在peerConnected事件中更新
    
    // 生成分享链接
    generateShareLink()
    
    log(`成功加入房间 "${roomName.value}"`)
  } catch (err: any) {
    log(`房间连接错误: ${err?.message || err}`)
  } finally {
    roomConnecting.value = false
  }
}

async function disconnectRoom() {
  try {
    if (roomMesh.value) {
      try { await roomMesh.value.stopMedia?.() } catch {}
      try { await roomMesh.value.disconnect?.() } catch {}
      try { await roomMesh.value.signalingClient?.disconnect?.() } catch {}
    }
  } finally {
    roomMesh.value = null
    roomConnected.value = false
    roomPeerCount.value = 0
    roomRemoteVideos.clear()
    if (roomLocalVideo.value) {
      roomLocalVideo.value.srcObject = null
    }
    log(`已离开房间 "${roomName.value}"`)
  }
}

async function startRoomMedia() {
  if (!roomMesh.value) return
  try {
    const stream: MediaStream = await roomMesh.value.startMedia({ video: true, audio: true })
    if (roomLocalVideo.value) {
      roomLocalVideo.value.srcObject = stream
      await roomLocalVideo.value.play().catch(() => {})
    }
    // 开启广播给所有已连接节点
    try { await roomMesh.value.enableStreamingForAllPeers?.() } catch {}
    log('房间本地媒体已启动')
  } catch (err: any) {
    log(`房间媒体启动错误: ${err?.message || err}`)
  }
}

async function stopRoomMedia() {
  if (!roomMesh.value) return
  try {
    await roomMesh.value.stopMedia()
    if (roomLocalVideo.value) {
      roomLocalVideo.value.srcObject = null
    }
    roomRemoteVideos.clear()
    log('房间本地媒体已停止')
  } catch (err: any) {
    log(`房间媒体停止错误: ${err?.message || err}`)
  }
}

async function sendRoomChat() {
  const text = roomChatInput.value.trim()
  if (!text || !roomMesh.value) return
  try {
    await roomMesh.value.sendMessage(text)
    roomMessages.push({ from: 'me', content: text, ts: Date.now() })
    roomChatInput.value = ''
  } catch (err: any) {
    log(`房间聊天发送失败: ${err?.message || err}`)
  }
}

onMounted(async () => {
  // Try to recall a previous session
  const recalled = await auth.recall?.()
  if (recalled && auth.authenticated) {
    await updateKeyData()
  }
})

onBeforeUnmount(() => {
  disconnectMesh()
})
</script>

<template>
  <div class="p-4 max-w-5xl mx-auto space-y-6">
    <h1 class="text-2xl font-semibold">PigeonChat Demo</h1>

    <!-- Auth -->
    <div class="space-y-4">
      <!-- Passkey Authentication -->
      <div v-if="!auth.authenticated" class="border rounded-lg p-4 bg-gray-50">
        <h3 class="text-lg font-medium mb-3">身份认证</h3>
        <div class="space-y-3">
          <!-- 注册新用户 -->
          <div class="flex items-center gap-2">
            <input 
              v-model="username" 
              class="border rounded px-3 py-2 flex-1" 
              placeholder="输入用户名进行注册"
              @keyup.enter="registerWithPasskey"
            />
            <button
              class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              :disabled="auth.loading || !username.trim()"
              @click="registerWithPasskey"
            >{{ auth.loading ? '注册中...' : 'Passkey注册' }}</button>
          </div>
          
          <!-- 登录现有用户 -->
          <div class="flex items-center gap-2">
            <button
              class="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50 flex-1"
              :disabled="auth.loading"
              @click="loginWithPasskey"
            >{{ auth.loading ? '登录中...' : 'Passkey登录' }}</button>
            
            <!-- 传统密码登录（备用） -->
            <button
              class="px-4 py-2 bg-gray-600 text-white rounded disabled:opacity-50"
              :disabled="auth.loading"
              @click="auth.login('demo-secret')"
            >演示登录</button>
          </div>
          
          <!-- Master Key登录 -->
          <div class="flex items-center gap-2">
            <input 
              v-model="masterKeyInput" 
              class="border rounded px-3 py-2 flex-1" 
              placeholder="粘贴Master Key (hkmk开头)"
              type="password"
              @keyup.enter="loginWithMasterKey"
            />
            <button
              class="px-4 py-2 bg-orange-600 text-white rounded disabled:opacity-50"
              :disabled="auth.loading || !masterKeyInput.trim()"
              @click="loginWithMasterKey"
            >{{ auth.loading ? '登录中...' : 'Master Key登录' }}</button>
          </div>
          
          <!-- 测试按钮 -->
           <div class="flex items-center gap-2">
             <button
               class="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
               :disabled="auth.loading"
               @click="testMasterKeyLogin"
             >测试Master Key登录</button>
             <button
               class="px-4 py-2 bg-teal-600 text-white rounded disabled:opacity-50"
               :disabled="auth.loading"
               @click="quickJoinTestRoom"
             >快速加入测试房间</button>
           </div>
        </div>
        
        <div v-if="auth.error" class="mt-2 text-sm text-red-600">
          错误: {{ auth.error }}
        </div>
      </div>
      
      <!-- 已认证状态 -->
      <div v-if="auth.authenticated" class="border rounded-lg p-4 bg-green-50">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-green-800 font-medium">✅ 已认证</span>
            <span class="ml-3 text-sm text-gray-600">ID: {{ (auth.identity||'').slice(0,20) }}…</span>
          </div>
          <div class="space-x-2">
            <button
              class="px-3 py-2 bg-indigo-600 text-white rounded text-sm"
              @click="showKeyDetails = !showKeyDetails"
            >{{ showKeyDetails ? '隐藏' : '查看' }}密钥详情</button>
            <button
              class="px-3 py-2 bg-slate-700 text-white rounded"
              @click="auth.logout()"
            >退出登录</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 密钥详情展示 -->
    <div v-if="auth.authenticated && showKeyDetails" class="border rounded-lg p-4 bg-blue-50">
      <h3 class="text-lg font-medium mb-4">🔐 密钥和签名数据</h3>
      
      <!-- Master Key 展示模块 -->
      <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div class="flex items-center mb-2">
          <h4 class="text-md font-semibold text-yellow-800">🔑 Master Key (主密钥)</h4>
          <span class="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">重要</span>
        </div>
        <p class="text-sm text-yellow-700 mb-3">
          ⚠️ 这是您的主密钥，用于登录时使用。请安全保存，不要泄露给他人！
        </p>
        <div class="relative">
          <textarea 
            :value="keyData.masterKey" 
            readonly 
            class="w-full h-16 text-xs font-mono bg-white border border-yellow-300 rounded px-3 py-2 resize-none"
            placeholder="Master Key将在此显示"
          ></textarea>
          <button
            v-if="keyData.masterKey"
            class="absolute top-2 right-2 px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
            @click="navigator.clipboard?.writeText(keyData.masterKey); log('Master Key已复制到剪贴板')"
          >复制</button>
        </div>
        <p class="text-xs text-yellow-600 mt-2">
          💡 提示：使用此Master Key可以在任何设备上登录您的账户
        </p>
      </div>
      
      <!-- 密钥信息 -->
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">公钥 (Public Key)</label>
            <textarea 
              :value="keyData.publicKey" 
              readonly 
              class="w-full h-20 text-xs font-mono bg-white border rounded px-2 py-1 resize-none"
              placeholder="未获取到公钥"
            ></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">身份标识 (Identity)</label>
            <textarea 
              :value="keyData.identity" 
              readonly 
              class="w-full h-20 text-xs font-mono bg-white border rounded px-2 py-1 resize-none"
              placeholder="未获取到身份标识"
            ></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">加密密钥 (Encryption Key)</label>
            <textarea 
              :value="keyData.encryptionKey" 
              readonly 
              class="w-full h-20 text-xs font-mono bg-white border rounded px-2 py-1 resize-none"
              placeholder="未获取到加密密钥"
            ></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">椭圆曲线 (Curve)</label>
            <input 
              :value="keyData.curve || '未指定'" 
              readonly 
              class="w-full text-sm bg-white border rounded px-2 py-1"
            />
          </div>
        </div>
        
        <!-- 签名操作 -->
        <div class="border-t pt-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-medium">数字签名测试</h4>
            <button
              class="px-3 py-2 bg-purple-600 text-white rounded text-sm"
              @click="createSignature"
            >创建新签名</button>
          </div>
          
          <!-- 签名列表 -->
          <div v-if="keyData.signatures.length > 0" class="space-y-2 max-h-60 overflow-auto">
            <div 
              v-for="(sig, idx) in keyData.signatures" 
              :key="idx" 
              class="bg-white border rounded p-3 text-sm"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-gray-500">
                  {{ new Date(sig.timestamp).toLocaleString() }}
                </span>
                <div class="flex items-center gap-2">
                  <span v-if="sig.verified === true" class="text-xs text-green-600 font-medium">✅ 有效</span>
                  <span v-else-if="sig.verified === false" class="text-xs text-red-600 font-medium">❌ 无效</span>
                  <button
                    class="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                    :disabled="sig.verifying"
                    @click="verifySignature(sig)"
                  >{{ sig.verifying ? '验证中...' : '验证签名' }}</button>
                </div>
              </div>
              <div class="space-y-1">
                <div>
                  <span class="font-medium text-gray-700">消息:</span>
                  <span class="ml-2 font-mono">{{ sig.message }}</span>
                </div>
                <div>
                  <span class="font-medium text-gray-700">签名:</span>
                  <div class="mt-1 font-mono text-xs bg-gray-100 p-2 rounded break-all">
                    {{ sig.signature }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="text-sm text-gray-500 text-center py-4">
            暂无签名记录，点击"创建新签名"开始测试
          </div>
        </div>
      </div>
    </div>

    <!-- Connect -->
    <div class="flex items-center gap-2">
      <input v-model="signalingUrl" class="border rounded px-2 py-1 flex-1" placeholder="ws://localhost:3000" />
      <button
        v-if="!connected"
        class="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
        :disabled="connecting || !auth.authenticated"
        @click="connectMesh"
      >{{ connecting ? 'Connecting…' : 'Connect' }}</button>
      <button v-else class="px-3 py-2 bg-rose-600 text-white rounded" @click="disconnectMesh">Disconnect</button>
    </div>

    <!-- Media Controls -->
    <div class="flex items-center gap-2">
      <button class="px-3 py-2 bg-sky-600 text-white rounded disabled:opacity-50" :disabled="!connected" @click="startMedia">Start Media</button>
      <button class="px-3 py-2 bg-amber-600 text-white rounded disabled:opacity-50" :disabled="!connected" @click="stopMedia">Stop Media</button>
    </div>

    <!-- Videos -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h3 class="font-medium mb-2">Local</h3>
        <video ref="localVideo" autoplay muted playsinline class="w-full bg-black rounded"></video>
      </div>
      <div>
        <h3 class="font-medium mb-2">Remote Streams</h3>
        <div v-if="remoteVideos.size === 0" class="text-sm text-gray-500">No remote streams yet.</div>
        <div v-for="([pid, stream], idx) in Array.from(remoteVideos.entries())" :key="pid+idx" class="mb-3">
          <div class="text-xs text-gray-600 mb-1">Peer {{ pid.slice(0,8) }}…</div>
          <video v-src-object="stream" autoplay playsinline class="w-full bg-black rounded"></video>
        </div>
      </div>
    </div>

    <!-- Chat -->
    <div class="space-y-2">
      <div class="flex gap-2">
        <input v-model="chatInput" class="border rounded px-2 py-1 flex-1" placeholder="Type a message" @keyup.enter="sendChat" />
        <button class="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50" :disabled="!connected || !chatInput.trim()" @click="sendChat">Send</button>
      </div>
      <div class="border rounded p-2 max-h-60 overflow-auto space-y-1">
        <div v-for="m in messages" :key="m.ts + m.from + m.content" class="text-sm">
          <span class="text-gray-500">{{ new Date(m.ts).toLocaleTimeString() }}</span>
          <span class="mx-1">•</span>
          <span class="font-mono">{{ m.from.slice(0,8) }}</span>
          <span class="mx-1">:</span>
          <span>{{ m.content }}</span>
        </div>
      </div>
    </div>

    <!-- 视频房间功能 -->
    <div class="border-t pt-6 mt-6">
      <h2 class="text-xl font-bold mb-4">🏠 视频房间</h2>
      
      <!-- 房间操作选项 -->
      <div class="space-y-4 mb-6">
        <!-- 创建房间按钮 -->
        <div class="flex items-center gap-2">
          <button
            class="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            :disabled="roomConnected"
            @click="showCreateRoom = true"
          >创建房间</button>
        </div>
        
        <!-- 加入房间区域 -->
        <div class="border rounded-lg p-4 bg-gray-50">
          <h3 class="text-lg font-medium mb-3">加入房间</h3>
          
          <!-- 手动输入加入 -->
          <div class="space-y-3 mb-4">
            <h4 class="text-md font-medium text-gray-700">手动输入房间信息:</h4>
            <div class="flex items-center gap-2">
              <label class="w-24 text-sm font-medium">房间密钥:</label>
              <input 
                v-model="roomMasterKey" 
                class="border rounded px-3 py-2 flex-1" 
                placeholder="输入房间Master Key (独立于身份验证)"
                type="password"
              />
            </div>
            
            <div class="flex items-center gap-2">
              <label class="w-24 text-sm font-medium">房间名称:</label>
              <input 
                v-model="roomName" 
                class="border rounded px-3 py-2 flex-1" 
                placeholder="输入房间名称"
              />
            </div>
            
            <div class="flex items-center gap-2">
              <label class="w-24 text-sm font-medium">信号地址:</label>
              <input 
                v-model="roomSignalingUrl" 
                class="border rounded px-3 py-2 flex-1" 
                placeholder="ws://localhost:3000"
              />
            </div>
            
            <div class="flex items-center gap-2">
              <button
                class="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
                :disabled="roomConnecting || roomConnected || !roomMasterKey.trim() || !roomName.trim()"
                @click="connectRoom"
              >{{ roomConnecting ? '加入中...' : '加入房间' }}</button>
            </div>
          </div>
          
          <!-- 通过分享链接加入 -->
          <div class="border-t pt-4">
            <h4 class="text-md font-medium text-gray-700 mb-2">或通过分享链接加入:</h4>
            <div class="flex items-center gap-2">
              <input 
                v-model="shareRoomInput" 
                class="border rounded px-3 py-2 flex-1" 
                placeholder="粘贴房间分享链接 (meshpath://room/...)"
              />
              <button
                class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                :disabled="roomConnecting || roomConnected || !shareRoomInput.trim()"
                @click="joinRoomByShareLink"
              >加入</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 房间连接状态 -->
      <div v-if="roomConnected" class="border rounded-lg p-4 bg-green-50 mb-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4">
            <span class="inline-flex items-center gap-1">
              <span class="w-2 h-2 bg-green-500 rounded-full"></span>
              房间: {{ roomName }}
            </span>
            <span class="inline-flex items-center gap-1">
              <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
              人数: {{ roomPeerCount + 1 }}
            </span>
          </div>
          <button 
            class="px-4 py-2 bg-red-600 text-white rounded" 
            @click="disconnectRoom"
          >离开房间</button>
        </div>
        
        <!-- 分享房间 -->
        <div class="border-t pt-4 mb-4">
          <h4 class="text-md font-medium text-gray-700 mb-2">分享房间:</h4>
          <div class="flex items-center gap-2">
            <input 
              v-model="roomShareLink" 
              class="border rounded px-3 py-2 flex-1 bg-white" 
              readonly 
              placeholder="房间分享链接"
            />
            <button
              class="px-4 py-2 bg-indigo-600 text-white rounded"
              @click="copyShareLink"
            >复制链接</button>
          </div>
        </div>
      </div>
      
      <!-- 房间媒体控制 -->
      <div v-if="roomConnected" class="flex items-center gap-2 mb-4">
        <button 
          class="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50" 
          :disabled="!roomConnected" 
          @click="startRoomMedia"
        >开启摄像头</button>
        <button 
          class="px-3 py-2 bg-orange-600 text-white rounded disabled:opacity-50" 
          :disabled="!roomConnected" 
          @click="stopRoomMedia"
        >关闭摄像头</button>
      </div>
      
      <!-- 房间视频显示 -->
      <div v-if="roomConnected" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h3 class="font-medium mb-2 flex items-center gap-2">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            我的视频
          </h3>
          <video ref="roomLocalVideo" autoplay muted playsinline class="w-full bg-black rounded"></video>
        </div>
        <div>
          <h3 class="font-medium mb-2 flex items-center gap-2">
            <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
            房间成员视频 ({{ roomRemoteVideos.size }})
          </h3>
          <div v-if="roomRemoteVideos.size === 0" class="text-sm text-gray-500 bg-gray-100 rounded p-4 text-center">
            暂无其他成员的视频流
          </div>
          <div v-for="([pid, stream], idx) in Array.from(roomRemoteVideos.entries())" :key="pid+idx" class="mb-3">
            <div class="text-xs text-gray-600 mb-1 flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              成员 {{ pid.slice(0,8) }}…
            </div>
            <video v-src-object="stream" autoplay playsinline class="w-full bg-black rounded"></video>
          </div>
        </div>
      </div>
      
      <!-- 房间聊天 -->
      <div v-if="roomConnected" class="space-y-2">
        <h3 class="font-medium flex items-center gap-2">
          <span class="w-2 h-2 bg-yellow-500 rounded-full"></span>
          房间聊天
        </h3>
        <div class="flex gap-2">
          <input 
            v-model="roomChatInput" 
            class="border rounded px-2 py-1 flex-1" 
            placeholder="输入消息..." 
            @keyup.enter="sendRoomChat" 
          />
          <button 
            class="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50" 
            :disabled="!roomConnected || !roomChatInput.trim()" 
            @click="sendRoomChat"
          >发送</button>
        </div>
        <div class="border rounded p-2 max-h-40 overflow-auto space-y-1 bg-gray-50">
          <div v-if="roomMessages.length === 0" class="text-sm text-gray-500 text-center py-2">
            暂无聊天消息
          </div>
          <div v-for="m in roomMessages" :key="m.ts + m.from + m.content" class="text-sm">
            <span class="text-gray-500">{{ new Date(m.ts).toLocaleTimeString() }}</span>
            <span class="mx-1">•</span>
            <span class="font-mono text-blue-600">{{ m.from === 'me' ? '我' : m.from.slice(0,8) }}</span>
            <span class="mx-1">:</span>
            <span>{{ m.content }}</span>
          </div>
        </div>
      </div>
      
      <!-- 创建房间对话框 -->
      <div v-if="showCreateRoom" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="showCreateRoom = false">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4" @click.stop>
          <h3 class="text-lg font-bold mb-4">创建新房间</h3>
          
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">房间名称:</label>
              <input 
                v-model="createRoomName" 
                class="w-full border rounded px-3 py-2" 
                placeholder="输入房间名称"
                @keyup.enter="createRoom"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">信号地址:</label>
              <input 
                v-model="createRoomSignalingUrl" 
                class="w-full border rounded px-3 py-2" 
                placeholder="ws://localhost:3000"
              />
            </div>
          </div>
          
          <div class="flex items-center gap-2 mt-6">
            <button
              class="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 flex-1"
              :disabled="!createRoomName.trim()"
              @click="createRoom"
            >创建房间</button>
            <button
              class="px-4 py-2 bg-gray-600 text-white rounded"
              @click="showCreateRoom = false"
            >取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Logs -->
    <details>
      <summary class="cursor-pointer select-none">Logs</summary>
      <pre class="text-xs whitespace-pre-wrap">{{ logs.join('\n') }}</pre>
    </details>
  </div>
</template>

<style scoped>
/* Ensure :srcObject binding works in Vue 3 */
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.input-group {
  margin-bottom: 15px;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.input-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.button-group button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.button-group button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.video-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.local-video, .remote-videos {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  background-color: white;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

video {
  width: 100%;
  height: 200px;
  background-color: #000;
  border-radius: 4px;
}

.chat-section {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: white;
}

.chat-messages {
  height: 200px;
  overflow-y: auto;
  border: 1px solid #eee;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #fafafa;
}

.message {
  margin-bottom: 8px;
  padding: 5px;
  border-radius: 4px;
  background-color: white;
}

.chat-input {
  display: flex;
  gap: 10px;
}

.chat-input input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.chat-input button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.room-info {
  background-color: #e8f5e8;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.logs {
  height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  padding: 10px;
  background-color: #f5f5f5;
  font-family: monospace;
  font-size: 12px;
}

/* 新增样式 */
.room-options {
  margin-bottom: 20px;
}

.create-room-btn {
  background-color: #28a745;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  margin-bottom: 20px;
}

.create-room-btn:hover {
  background-color: #218838;
}

.create-room-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.join-room-section {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background-color: white;
}

.manual-join {
  margin-bottom: 20px;
}

.share-join {
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.share-join h5 {
  margin-bottom: 10px;
  color: #666;
  font-size: 14px;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.leave-room-btn {
  background-color: #dc3545;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.leave-room-btn:hover {
  background-color: #c82333;
}

.share-room {
  margin-bottom: 20px;
}

.share-link-container {
  display: flex;
  gap: 10px;
}

.share-link-container input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f8f9fa;
}

.share-link-container button {
  background-color: #6f42c1;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.share-link-container button:hover {
  background-color: #5a32a3;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin-bottom: 20px;
  color: #333;
}

.modal-content .input-group {
  margin-bottom: 15px;
}

.modal-content .input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.modal-content .input-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.modal-content .button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-content .button-group button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.modal-content .button-group button:first-child {
  background-color: #28a745;
  color: white;
}

.modal-content .button-group button:first-child:hover {
  background-color: #218838;
}

.modal-content .button-group button:first-child:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.modal-content .button-group button:last-child {
  background-color: #6c757d;
  color: white;
}

.modal-content .button-group button:last-child:hover {
  background-color: #5a6268;
}
</style>