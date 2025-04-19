
const DOMAIN_TTL_SECONDS = 60

const domainRegistry = {}
const wanAssignments = new Map()
const lanAssignments = new Map()
const ipRegistry = {}
const lanRegistry = {}
const lanConnections = {}
const messageQueue = {}
const activeDomainServers = []
const openPorts = {}
let nextLanId = 2
const peripheralGroups = {}
// internet_domain_peripherals.js with per-peripheral LAN network, domain-aware send/receive, and DNS polling (no energy system)
function generateRandomWanIp() {
  let ip
  do {
    ip = (
      Math.floor(Math.random() * 256) + "." +
      Math.floor(Math.random() * 256) + "." +
      Math.floor(Math.random() * 256) + "." +
      Math.floor(Math.random() * 256)
    )
  } while (global.ipRegistry[ip])
  return ip
}
function valueInNestedObject(group, targetValue) {
  for (const key in group) {
    if (group[key] === targetValue) {
      return true , targetValue;
    }
  }
  return false;
}
function getParentKeysOfSubkey(obj, targetSubKey) {
  const keys = [];

  for (const [key, subObj] of Object.entries(obj)) {
    if (targetSubKey in subObj) {
      keys.push(key);
    }
  }

  return keys;
}
function findPath(obj, targetKey, currentPath) {
  if (!currentPath) currentPath = []
  const path = []
  for (let key in obj) {
    const value = obj[key];
    path.push(currentPath);
    path.push(key)

    if (key === targetKey) {
      return path;
    }

    if (typeof value === 'object' && value !== null) {
      const result = findPath(value, targetKey, path);
      if (result) return result;
    }
  }

  return null; // not found
}
function removeValueAtPath(obj, path) {
  let current = obj;
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }
  current = null
  return true;
}
function getOrAssignIps(container, computer) {
  if (!container || !container.getPos() || !computer) return { wan: null, lan: null }

  const pos = container.getPos()
  const id = `${pos.x},${pos.y},${pos.z}`
  const computerId = computer.getID()

  if (!global.peripheralGroups[id]) global.peripheralGroups[id] = {}
  if (!messageQueue[id]) messageQueue[id] = {}
  if (!messageQueue.wan) messageQueue.wan = {}
  if (!global.wanAssignments[id]) {
    let wan = generateRandomWanIp()
    global.wanAssignments[id] = wan
    global.ipRegistry[wan] = true
    messageQueue.wan[wan] = []
    console.info("[The Network] Wan ip Registered At "+ id+ " As "+ wan)
  }

  if (!global.peripheralGroups[id][computerId]) {
    if (findPath(global.peripheralGroups,computerId )){
      let path = findPath(global.peripheralGroups,computerId )
      removeValueAtPath(global.peripheralGroups,path)
    }
    let lan = "192.168.0." + global.nextLanId++
    global.peripheralGroups[id][computerId] = lan
    global.lanRegistry[lan] = true
    global.lanConnections[lan] = []
    messageQueue[id][lan] = []
    console.info("[The Network] Lan ip Registered At "+ id + " For Pc " + computerId+ " As "+ lan)
  }
  let wan = global.wanAssignments[id]
  let lan = global.peripheralGroups[id][computerId]

  if (!openPorts[wan]) openPorts[wan] = {}
  return {
    wan: wan,
    lan: lan,
    computerId: computerId,
    posId: id
  }
}

// --- NETWORK MODEM Peripheral ---
ComputerCraftEvents.peripheral(event => {
  event.registerPeripheral("network_modem", "the_network:network_per")

    .method("getIp", (container, direction, args, computer) => {
      const mode = args[0] || "wan"
      const ips = getOrAssignIps(container, computer)
      const value = mode === "lan" ? ips.lan : ips.wan
      return {status: true, value:value.toString()}
    })

    .method("send", (container, direction, args, computer) => {
      const port = args[2] || 8080
      const ips = getOrAssignIps(container, computer)
      const from = ips.wan
      let to = args[0]
      const message = args[1]

      if (!global.ipRegistry[to] && global.domainRegistry[to]) {
        to = global.domainRegistry[to].ip
      }

      if (!global.ipRegistry[to]) return {status:false , error:"Connection Timeout",port: port}
      if (!messageQueue.wan[to]) messageQueue.wan[to] = []

      messageQueue.wan[to].push({ port: port, message: message })
      console.info("[The Network] Wan Message Sent From "+ from + " to "+ to +":"+ port +" With The Message "+ message)
      return {status:true, message:message, port: port}
    })

    .method("receive", (container, direction, args, computer) => {
      const port = args[0] || 8080
      const ips = getOrAssignIps(container, computer)
      const ip = ips.wan
      const queue = messageQueue.wan[ip]
      const message = queue.shift()
      if (message){
        if (message && message.port == port){
          if (openPorts[ip] && openPorts[ip][port] === ips.computerId){
            return {status:true , message:message.message, port: port}
          }else {
            messageQueue.wan[ip].push(message)
            return {status:false , error:"Port Not Open",port: port}
          }
        }else if (message.port != port){
          messageQueue.wan[ip].push(message)
          return {status:false , error:"message Recived But Not on the right port",port: port}
        }
        messageQueue.wan[ip].push(message)
        return {status:false , error:"Message Recived But Unable To Determine",port: port}
      }else {
        return {status:false , error:"No Message",port: port}
      }
      return {status:false , error:"Complete Fail",port: port}
    })

    .method("sendLan", (container, direction, args, computer) => {
      const fromInfo = getOrAssignIps(container, computer)
      const from = fromInfo.lan
      const toIp = args[0]
      const message = args[1]

      const group = global.peripheralGroups[fromInfo.posId]
      if (!group) return  {status: false, error:"Error Connecting To Network Modem"}
      const targetFound = valueInNestedObject(group, toIp)
      if (!targetFound) return {status: false, error:"Connection Timeout"}

      if (!messageQueue[fromInfo.posId][toIp]) messageQueue[fromInfo.posId][toIp] = []
      messageQueue[fromInfo.posId][toIp].push({ from: from, message: message })
      console.info("[The Network] Lan Message Sent From "+ from + " to "+ toIp +" With The Message "+ message + " At " + fromInfo.posId)
      return {status:true, message:message}
    })

    .method("receiveLan", (container, direction, args, computer) => {
      const myIp = getOrAssignIps(container, computer)
      const queue = messageQueue[myIp.posId][myIp.lan]
      return queue && queue.length ? {status: true,message: queue.shift().message} : {status: false, error: "No Message" }
    })

    .method("ping", (container, direction, args, computer) => {
      let to = args[0]
      const now = Date.now()
      if (!global.ipRegistry[to] && global.domainRegistry[to]) {
        to = global.domainRegistry[to].ip
      }
      if (!global.ipRegistry[to]) return {status: false, error:"Connection Timeout"}

      if (!messageQueue[to]) messageQueue[to] = []
      messageQueue[to].push({ from: getOrAssignIps(container, computer).wan, message: `ping:${now}` })
      return {status: true}
    })

    .method("openPort", (container, direction, args, computer) => {
      const port = args[0]
      const ip = getOrAssignIps(container, computer).wan
      if (!openPorts[ip]) openPorts[ip] = {}
      openPorts[ip][port] = computer.getID()
      return  {status: true}
    })

    .method("closePort", (container, direction, args, computer) => {
      const port = args[0]
      const ip = getOrAssignIps(container, computer).wan
      if (openPorts[ip]) if (openPorts[ip][port] === computer.getID()) {
        delete openPorts[ip][port]
        return {status: true}
      }else {
        return {status: false, error:"Not Your Port"}
      }
      return {status: false, error:"Complete Fail"}
    })
})


// --- DOMAIN SERVER Peripheral ---
ComputerCraftEvents.peripheral(event => {
  event.registerPeripheral("domain_server", "the_network:domain_server_per")

    .method("register", (container, direction, args, computer) => {
      const domain = args[0]
      if (!domain || typeof domain == "string") return {status: false, error:"Invalid Domain Format"}

      const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
      if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
      const wan = global.wanAssignments[linkid[0]]
      if (global.domainRegistry[domain] && global.domainRegistry[domain].location != linkid[0]) return {status: false, error:"you Dont Own This Domain"}
      global.domainRegistry[domain] = {
        location: linkid,
        ip: wan
      }
      console.info("[The Network] Domain Registered " + domain + " for "+ linkid + " or "+ wan)
      return  {status: true}
    })

    .method("unregister", (container, direction, args, computer) => {
      const domain = args[0]
      const linkid = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())
      if (linkid.length == 0) {return {status: false, error:"Please Attach A Network Modem"}}
      if (global.domainRegistry[domain] && global.domainRegistry[domain].location != linkid[0]) return {status: false, error:"you Dont Own This Domain"}
      delete global.domainRegistry[domain]
      console.info("[The Network] Domain Unregistered " + domain + " for "+ linkid + " or "+ wan)
      return {status:true}
    })

    .method("poll", (container, direction, args, computer) => {
      const ips = getOrAssignIps(container, computer)
      const id = getParentKeysOfSubkey(global.peripheralGroups, computer.getID())    
      const ip = global.wanAssignments[id[0]]
      if (!ip || !messageQueue.wan[ip]) return {status: false, error: "No Queue"}

      const queue = messageQueue.wan[ip]
      const result = {}
      if (queue.length != 0) {
        const packet = queue.shift()
        const msg = packet.message
        
        result.status = true
        result.message = msg
        result.port = packet.port
        return result 
      }else {
        return {status: false, error: "No Message" }
      }
      return {status:false, error: "Complete Fail"}
    })
})
