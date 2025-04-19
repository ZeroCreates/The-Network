// Handles saving/loading your complex networking state
const FILE_PATH = 'kubejs/data/my_network_data.json'
global.tickE = false
const DEFAULTS = {
  DOMAIN_TTL_SECONDS: 60,
  domainRegistry: {},
  wanAssignments: {},
  ipRegistry: {},
  lanRegistry: {},
  lanConnections: {},
  openPorts: {},
  nextLanId: 2,
  peripheralGroups: {},
  globalStargates: {},
  localStargates: {},
  syncedStargates: {},
  syncedProto: {}
}
const file = `world/data/network_data.json`
// Convert Maps to plain objects
function serialize(data) {
    return data
}

// Convert plain objects back into Maps
function deserialize(data) {
    return data
}

function load() {
  const loaded = JsonIO.read(file)
  if (loaded){
    const data = JSON.parse(loaded.data)
    return data
  }else{
    return null
  }
}

function save(data) {
  JsonIO.write(file, {data:JSON.stringify(data)})
}

let tickCount = 0
ServerEvents.loaded(event => {
  if (global.tickE == false){
    const data = load()
    if (data != null){
      global.DOMAIN_TTL_SECONDS = data.DOMAIN_TTL_SECONDS
      global.domainRegistry = data.domainRegistry
      global.wanAssignments = data.wanAssignments
      global.ipRegistry = data.ipRegistry
      global.lanRegistry = data.lanRegistry
      global.lanConnections = data.lanConnections
      global.openPorts = data.openPorts
      global.nextLanId = data.nextLanId
      global.peripheralGroups = data.peripheralGroups
      
      global.globalStargates = data.globalStargates
      global.localStargates = data.localStargates
      global.syncedStargates = data.syncedStargates
      global.syncedProto = data.syncedProto
  
      console.log('[The Network(Saver)] Persistent network data loaded.')
      global.tickE = true
    }else {
      global.DOMAIN_TTL_SECONDS = 60
      global.domainRegistry = {}
      global.wanAssignments = {}
      global.ipRegistry = {}
      global.lanRegistry = {}
      global.lanConnections = {}
      global.openPorts = {}
      global.nextLanId = 2
      global.peripheralGroups = {}
      
      global.globalStargates = {}
      global.localStargates = {}
      global.syncedStargates = {}
      global.syncedProto = {}

      console.log('[The Network(Saver)] Default loaded.')
    }
  }
})

// Save automatically every 5 seconds (100 ticks)
ServerEvents.unloaded(event => {
  const data = {
    DOMAIN_TTL_SECONDS: global.DOMAIN_TTL_SECONDS,
    domainRegistry: global.domainRegistry,
    wanAssignments: global.wanAssignments,
    ipRegistry: global.ipRegistry,
    lanRegistry: global.lanRegistry,
    lanConnections: global.lanConnections,
    messageQueue: global.messageQueue,
    activeDomainServers: global.activeDomainServers,
    openPorts: global.openPorts,
    nextLanId: global.nextLanId,
    peripheralGroups: global.peripheralGroups,
    globalStargates: global.globalStargates,
    localStargates: global.localStargates,
    syncedStargates: global.syncedStargates,
    syncedProto: global.syncedProto
  }
  save(data) 
  console.log('[The Network(Saver)] Persistent network data Saved.')
})
